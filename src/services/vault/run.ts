import { each } from 'async'
import { formatDuration, intervalToDuration } from 'date-fns'
import {
  getSelectedVaults,
  mapVaultsIteratorItem,
} from '../../providers/vaults'
import {
  CommandsExecutedOnVaults,
  CustomError,
  FactoryFlagsWithVaults,
  RunArgs,
  RunCommandCallback,
  RunCommandCallbackResult,
  RunCommandIterator,
  RunFlags,
} from '../../types/commands'
import {
  asyncExecCustomCommand,
  handlerCommandError,
} from '../../utils/command'
import {
  CUSTOM_COMMAND_LOGGER_FILE,
  customCommandLogger,
  logger,
  silentCheck,
} from '../../utils/logger'
import { loadConfig } from '../config'

const taskExecutedOnVaults: CommandsExecutedOnVaults = {}

const runCommandVaultIterator: RunCommandIterator = async (item) => {
  const { vault, args, flags } = item
  const { command } = args
  const internalCustomLogger = logger.child({
    vault: { path: vault.path, name: vault.name },
    command,
  })
  const internalCustomCommandLogger = customCommandLogger.child({
    vault: { path: vault.path, name: vault.name },
    command,
  })

  internalCustomLogger.debug(`Execute command`)

  const vaultPathHash = btoa(`${vault.name}:${vault.path}`)
  taskExecutedOnVaults[vaultPathHash] = {
    success: null,
    duration: '',
    error: null,
  }

  try {
    const startDate = new Date()
    const cwd = flags.cwd ? flags.cwd : vault.path
    const result = await asyncExecCustomCommand(vault, command, cwd)
    const endDate = new Date()
    const durationLessThanSecond = endDate.getTime() - startDate.getTime()
    const durationMoreThanSecond = intervalToDuration({
      start: startDate,
      end: endDate,
    })

    const formattedDuration =
      formatDuration(durationMoreThanSecond, {
        format: ['hours', 'minutes', 'seconds'],
      }) || `${durationLessThanSecond.toString()} ms`

    taskExecutedOnVaults[vaultPathHash] = {
      success: null,
      duration: formattedDuration,
      error: null,
    }

    const trimmedResult = result.trim()
    taskExecutedOnVaults[vaultPathHash]['success'] = true
    taskExecutedOnVaults[vaultPathHash]['stdout'] = trimmedResult

    internalCustomCommandLogger.info('Executed successfully', {
      result: trimmedResult,
    })

    if (silentCheck<RunFlags>(flags)) {
      internalCustomLogger.info(`Run command`, {
        log: CUSTOM_COMMAND_LOGGER_FILE,
      })
    }

    return taskExecutedOnVaults[vaultPathHash]
  } catch (error) {
    const typedError = error as CustomError
    taskExecutedOnVaults[vaultPathHash]['success'] = false
    taskExecutedOnVaults[vaultPathHash]['error'] = typedError
    internalCustomCommandLogger.error('Execution failed', {
      error,
    })

    return taskExecutedOnVaults[vaultPathHash]
  }
}

const action = async (
  args: RunArgs,
  flags: FactoryFlagsWithVaults<RunFlags>,
  iterator: RunCommandIterator = runCommandVaultIterator,
  callback?: RunCommandCallback,
) => {
  if (!args.command || args.command === '') {
    customCommandLogger.error('Command is empty', {
      command: args.command,
    })
    const emptyCommandError = new Error('Command is empty')
    throw emptyCommandError
  }

  const config = await loadConfig(flags.config)
  const selectedVaults = await getSelectedVaults(flags.path)

  customCommandLogger.debug('Running command on selected vaults...', {
    vaults: selectedVaults.length,
  })

  const items = mapVaultsIteratorItem<
    RunArgs,
    FactoryFlagsWithVaults<RunFlags>
  >(selectedVaults, config, flags, args)

  const commandVaultCallback = (error: CustomError | null | undefined) => {
    const result: RunCommandCallbackResult = {
      success: false,
      error,
      sortedTaskExecutedOnVaults: {},
    }

    if (!error) {
      result.success = true
      result.sortedTaskExecutedOnVaults = Object.entries(taskExecutedOnVaults)
        .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
        .reduce<CommandsExecutedOnVaults>((acc, [key, value]) => {
          const [vaultName] = atob(key).split(':')
          acc[vaultName] = value
          return acc
        }, {})

      logger.info('Run operation finished!', {
        custom_commands_log_path: CUSTOM_COMMAND_LOGGER_FILE,
      })

      if (flags.output === 'table') {
        console.table(result.sortedTaskExecutedOnVaults)
      } else if (flags.output === 'json') {
        console.log(JSON.stringify(result.sortedTaskExecutedOnVaults, null, 2))
      }

      callback?.(null)
      return result
    }

    logger.error('UnhandledException', {
      error: JSON.stringify(error),
      path: flags.path,
    })
    callback?.(error)
    handlerCommandError(error)

    return result
  }

  return each(items, iterator, commandVaultCallback)
}

export { action, runCommandVaultIterator }
