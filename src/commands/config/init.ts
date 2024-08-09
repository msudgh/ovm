import { flush } from '@oclif/core'
import { ArgInput } from '@oclif/core/lib/parser'
import FactoryCommand, {
  CommonFlags,
  FactoryFlags,
} from '../../providers/command'
import { createDefaultConfig, safeLoadConfig } from '../../providers/config'
import { logger } from '../../utils/logger'

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
      await this.action(args, this.flagsInterceptor(flags))
    } catch (error) {
      this.handleError(error)
    } finally {
      flush()
    }
  }

  /**
   * Main action method for the command.
   * @param {ArgInput} args - The arguments passed to the command.
   * @param {FactoryFlags<InitFlags>} flags - The flags passed to the command.
   * @returns {Promise<void>}
   */
  private async action(
    args: ArgInput,
    flags: FactoryFlags<CommonFlags>,
  ): Promise<void> {
    try {
      const { data: config, error } = await safeLoadConfig(flags.config)

      if (config) {
        logger.error('File already exists!', { config: flags.config })
        process.exit(1)
      }

      if (error) {
        throw error
      }
    } catch (error) {
      const typedError = error as Error

      if (typedError && typedError.message === 'Config file not found') {
        try {
          await createDefaultConfig(flags.config)
          logger.info('Config file created', { path: flags.config })
        } catch (error) {
          this.handleError(error)
        }
      } else {
        this.handleError(typedError)
      }
    }
  }
}
