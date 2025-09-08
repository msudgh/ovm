import { flush } from '@oclif/core'
import { ArgInput } from '@oclif/core/lib/parser'
import { FactoryCommand } from '../../providers/factory'
import { createDefaultConfig, safeLoadConfig } from '../../services/config'
import { Config } from '../../services/config/index.types'
import {
  FactoryFlags,
  InitCommandCallback,
  InitFlags,
} from '../../types/commands'
import { flagsInterceptor } from '../../utils/command'

/**
 * Init command configure an ovm.json config file in user's home dir.
 */
export default class Init extends FactoryCommand {
  static readonly aliases = ['ci', 'config init']
  static override readonly description = `Configure an ovm.json config file in user's home dir.`
  static override readonly examples = ['<%= config.bin %> <%= command.id %>']
  static override readonly flags = {
    ...this.commonFlags,
  }

  /**
   * Executes the command.
   * Parses the arguments and flags, and calls the action method.
   * Handles errors and ensures flushing of logs.
   */
  public async run() {
    try {
      const { args, flags } = await this.parse(Init)
      await action(args, flagsInterceptor<FactoryFlags<InitFlags>>(flags))
    } catch (error) {
      this.handleError(error)
    } finally {
      flush()
    }
  }
}

/**
 * Main action function for the Init command.
 * @param {ArgInput} args - The arguments passed to the command.
 * @param {FactoryFlags<InitFlags>} flags - The flags passed to the command.
 * @param {InitCommandCallback} callback - Error handling function.
 * @returns {Promise<void>}
 */
export const action = async (
  args: ArgInput,
  flags: FactoryFlags<InitFlags>,
  callback?: InitCommandCallback,
): Promise<Config | undefined> => {
  const { config: configPath } = flags
  const { data: config, error } = await safeLoadConfig(configPath)

  if (error && error.message === 'Config file not found') {
    const defaultConfig = await createDefaultConfig(configPath)

    if (callback) {
      callback(null)
    }

    return defaultConfig
  } else if (error) {
    if (callback) {
      callback(error)
    }
  }

  callback?.(null)

  return config
}
