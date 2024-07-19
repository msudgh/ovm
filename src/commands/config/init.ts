import { flush } from '@oclif/core'
import { ArgInput } from '@oclif/core/lib/parser'
import FactoryCommand, { CommonFlags, FactoryFlags } from '../../providers/command'
import { createDefaultConfig, loadConfig } from '../../providers/config'

const description = `Configure an ovm.json config file in user's home dir.`

/**
 * Init command configure an ovm.json config file in user's home dir.
 */
export default class Init extends FactoryCommand {
  static readonly aliases = ['ci', 'config:init']
  static override readonly description = description
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
      const {args, flags} = await this.parse(Init)
      await this.action(args, flags)
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
  private async action(args: ArgInput, flags: FactoryFlags<CommonFlags>): Promise<void> {
    this.flagsInterceptor(flags)

    try {
      const config = await loadConfig(flags.config)

      if (config) {
        this.log(`Config path: ${flags.config}`)
        this.error('File already exists!')
      }
    } catch (error) {
      const typedError = error as Error

      if (typedError && typedError.message === 'Config file not found') {
        try {
          await createDefaultConfig(flags.config)
          this.log(`Config path: ${flags.config}`)
          this.log('File created!')
        } catch (error) {
          this.handleError(error)
        }
      } else {
        this.handleError(typedError)
      }
    }
  }
}
