import { Args, Flags, flush, handle } from '@oclif/core'
import { each, eachSeries, ErrorCallback } from 'async'
import { exec, ExecException } from 'child_process'
import { formatDuration, intervalToDuration } from 'date-fns'
import { Vault } from 'obsidian-utils'
import { CommandsExecutedOnVaults } from '../../commands'
import FactoryCommand, { FactoryFlags } from '../../providers/command'
import { safeLoadConfig } from '../../providers/config'
import { vaultsSelector } from '../../providers/vaults'
import {
  RESERVED_VARIABLES,
  VAULTS_PATH_FLAG_DESCRIPTION,
} from '../../utils/constants'
import {
  CUSTOM_COMMAND_LOGGER_FILE,
  customCommandLogger,
  logger,
} from '../../utils/logger'

interface CommandArgs {
  [key: string]: string
}

interface RunFlags {
  path: string
  output: string
  unescape: boolean
  async: boolean
  silent: boolean
  runFromVaultDirectoryAsWorkDir: boolean
}

interface ExecuteCustomCommandResult {
  stdout: string
  stderr: string
  error: ExecException | null
}

export default class Run extends FactoryCommand {
  static readonly aliases = ['r', 'run', 'vr', 'vaults run']
  static override readonly description = `Run a shell command on selected vaults (using Node.js child_process).`
  static override readonly examples = [
    '<%= config.bin %> <%= command.id %> --path=/path/to/vaults',
    '<%= config.bin %> <%= command.id %> --path=/path/to/vaults/*/.obsidian --output=json',
    '<%= config.bin %> <%= command.id %> --path=/path/to/vaults/**/.obsidian --output=json --unescape=false',
    '<%= config.bin %> <%= command.id %> --output=json --async=false',
    '<%= config.bin %> <%= command.id %> --output=json --silent=true',
    '<%= config.bin %> <%= command.id %> --output=json --runFromVaultDirectoryAsWorkDir=false',
  ]
  static override readonly flags = {
    path: Flags.string({
      char: 'p',
      description: VAULTS_PATH_FLAG_DESCRIPTION,
      default: '',
    }),
    output: Flags.string({
      char: 'o',
      description: 'Display the output with a specific transformer.',
      default: 'table',
      options: ['table', 'json'],
    }),
    unescape: Flags.boolean({
      char: 'u',
      description:
        'Unescape special characters in a command to run as a single command.',
      default: true,
    }),
    async: Flags.boolean({
      char: 'a',
      description: 'Run the command in parallel on the vault(s).',
      default: true,
    }),
    silent: Flags.boolean({
      char: 's',
      description: 'Silent on results of the custom command on vault(s).',
      default: false,
    }),
    runFromVaultDirectoryAsWorkDir: Flags.boolean({
      char: 'r',
      description: 'Run the command from the vault directory as working dir.',
      default: true,
    }),
    ...this.commonFlags,
  }

  static override readonly args = {
    command: Args.string({
      description:
        'Command to run and use specified vaults with each execution.',
      required: true,
    }),
  }

  /**
   * Executes the command.
   * Parses the arguments and flags, and calls the action method.
   * Handles errors and ensures flushing of logs.
   */
  public async run() {
    try {
      const { args, flags } = await this.parse(Run)
      await this.action(args, this.flagsInterceptor(flags))
    } catch (error) {
      this.handleError(error)
    } finally {
      flush()
    }
  }

  /**
   * Main action method for the command.
   * Loads vaults, selects vaults, and gets stats about number of vaults and installed plugins per vault.
   * @param {ArgInput} args - The arguments passed to the command.
   * @param {FactoryFlags<RunFlags>} flags - The flags passed to the command.
   * @returns {Promise<void>}
   */
  private async action(
    args: CommandArgs,
    flags: FactoryFlags<RunFlags>,
  ): Promise<void> {
    const { command } = args
    const { path, output } = flags
    const { success: loadConfigSuccess, error: loadConfigError } =
      await safeLoadConfig(flags.config)
    if (!loadConfigSuccess) {
      logger.error('Failed to load config', { error: loadConfigError })
      process.exit(1)
    }

    const vaults = await this.loadVaults(path)
    const selectedVaults = await vaultsSelector(vaults)
    const vaultsWithCommand = selectedVaults.map((vault: Vault) => ({
      vault,
      command: this.commandInterpolation(vault, command),
    }))

    const taskExecutedOnVaults: CommandsExecutedOnVaults = {}

    const commandVaultIterator = async (opts: {
      vault: Vault
      command: CommandArgs['command']
    }) => {
      const { vault, command } = opts
      logger.debug(`Execute command`, { vault, command })

      try {
        const startDate = new Date()
        const result = await this.asyncExecCustomCommand(
          command,
          flags.runFromVaultDirectoryAsWorkDir,
          vault,
        )
        const endDate = new Date()
        const durationLessThanSecond = endDate.getTime() - startDate.getTime()
        const durationMoreThanSecond = intervalToDuration({
          start: startDate,
          end: endDate,
        })

        const formattedDuration =
          formatDuration(durationMoreThanSecond, {
            format: ['hours', 'minutes', 'seconds'],
          }) || `${durationLessThanSecond} ms`

        taskExecutedOnVaults[vault.name] = {
          success: null,
          duration: formattedDuration,
          error: null,
        }

        if (result) {
          taskExecutedOnVaults[vault.name]['success'] = true
          customCommandLogger.info('Executed successfully', {
            result,
            vault,
            command,
          })
          if (!flags.silent) {
            logger.info(`Run command`, { vault, command })
            console.log(result)
          }
        }
      } catch (error) {
        taskExecutedOnVaults[vault.name]['error'] = JSON.stringify(error)
        customCommandLogger.error('Execution failed', {
          error: JSON.stringify(error),
          vault,
          command,
        })
      }
    }

    const commandVaultErrorCallback: ErrorCallback<Error> = (
      error: Error | null | undefined,
    ) => {
      if (error) {
        logger.debug('UnhandledException', {
          error: JSON.stringify(error),
          path,
        })
        handle(error)
        return error
      } else {
        const sortedTaskExecutedOnVaults = Object.entries(taskExecutedOnVaults)
          .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
          .reduce((acc, [key, value]) => {
            acc[key] = value
            return acc
          }, {} as CommandsExecutedOnVaults)

        logger.info('Run operation finished!', {
          custom_commands_log_path: CUSTOM_COMMAND_LOGGER_FILE,
        })

        if (output === 'table') {
          console.table(sortedTaskExecutedOnVaults)
        } else if (output === 'json') {
          console.log(JSON.stringify(sortedTaskExecutedOnVaults, null, 2))
        }
      }
    }
    customCommandLogger.debug('Running command on selected vaults...', {
      vaults: vaultsWithCommand.length,
    })

    if (flags.async) {
      each(vaultsWithCommand, commandVaultIterator, commandVaultErrorCallback)
    } else {
      eachSeries(
        vaultsWithCommand,
        commandVaultIterator,
        commandVaultErrorCallback,
      )
    }
  }

  private async asyncExecCustomCommand(
    command: string,
    runFromVaultDirectoryAsWorkDir: boolean,
    vault: Vault,
  ): Promise<Pick<ExecuteCustomCommandResult, 'error'> | string> {
    return new Promise((resolve, reject) => {
      exec(
        command,
        { cwd: runFromVaultDirectoryAsWorkDir ? vault.path : __dirname },
        (error, stdout, stderr) => {
          if (error) {
            return reject(error)
          }
          resolve(`${stderr}\n${stdout}`)
        },
      )
    })
  }

  private commandInterpolation(vault: Vault, command: string): string {
    const variableRegex = /\{(\d*?)}/g
    const replacer = (match: string, variable: string) => {
      const variableFunction = RESERVED_VARIABLES[variable]

      if (variableFunction) {
        return variableFunction(vault)
      } else {
        return match
      }
    }
    const interpolatedCommand = command.replace(variableRegex, replacer)

    return interpolatedCommand
  }
}
