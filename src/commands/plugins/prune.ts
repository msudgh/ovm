import { flush } from '@oclif/core'
import { FactoryCommandWithVaults } from '../../providers/factory'
import { action } from '../../services/plugin/prune'
import { FactoryFlagsWithVaults, PruneFlags } from '../../types/commands'
import { flagsInterceptor } from '../../utils/command'

/**
 * Prune command list and remove plugins that aren't referred in config file.
 */
export default class Prune extends FactoryCommandWithVaults {
  static readonly aliases = ['pp', 'plugins prune']
  static override readonly description = `Prune existing plugin(s) from vaults that are unspecified in the config file.`
  static override readonly examples = [
    '<%= config.bin %> <%= command.id %> --path=/path/to/vaults',
    '<%= config.bin %> <%= command.id %> --path=/path/to/vaults/*/.obsidian',
    '<%= config.bin %> <%= command.id %> --path=/path/to/vaults/**/.obsidian',
  ]
  static override readonly flags = {
    ...this.commonFlagsWithPath,
  }

  /**
   * Executes the command.
   * Parses the arguments and flags, and calls the action method.
   * Handles errors and ensures flushing of logs.
   */
  public async run() {
    try {
      const { args, flags } = await this.parse(Prune)
      await action(
        args,
        flagsInterceptor<FactoryFlagsWithVaults<PruneFlags>>(flags),
      )
    } catch (error) {
      this.handleError(error)
    } finally {
      flush()
    }
  }
}
