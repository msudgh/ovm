import { Args, flush } from '@oclif/core'
import { FactoryCommandWithVaults } from '../../providers/factory'
import { action } from '../../services/plugin/uninstall'
import { FactoryFlagsWithVaults, UninstallFlags } from '../../types/commands'
import { flagsInterceptor } from '../../utils/command'

/**
 * Uninstall command removes specified plugins from vaults.
 */
export default class Uninstall extends FactoryCommandWithVaults {
  static readonly aliases = ['pu', 'plugins uninstall']
  static override readonly description = `Uninstall plugin(s) from vaults.`
  static override readonly examples = [
    '<%= config.bin %> <%= command.id %> --path=/path/to/vaults',
    '<%= config.bin %> <%= command.id %> --path=/path/to/vaults/*/.obsidian',
    '<%= config.bin %> <%= command.id %> --path=/path/to/vaults/**/.obsidian',
    '<%= config.bin %> <%= command.id %> id',
  ]
  static override readonly flags = {
    ...this.commonFlagsWithPath,
  }
  static override readonly args = {
    pluginId: Args.string({
      description: 'Specific Plugin ID to uninstall',
      required: false,
    }),
  }

  /**
   * Executes the command.
   * Parses the arguments and flags, and calls the action method.
   * Handles errors and ensures flushing of logs.
   */
  public async run() {
    try {
      const { args, flags } = await this.parse(Uninstall)
      await action(
        args,
        flagsInterceptor<FactoryFlagsWithVaults<UninstallFlags>>(flags),
      )
    } catch (error) {
      this.handleError(error)
    } finally {
      flush()
    }
  }
}
