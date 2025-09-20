import { flush } from '@oclif/core'
import { FactoryCommandWithVaults, outputFlag } from '../../providers/factory'
import { action } from '../../services/vault/stats'
import { FactoryFlagsWithVaults, StatsFlags } from '../../types/commands'
import { flagsInterceptor } from '../../utils/command'

export default class Stats extends FactoryCommandWithVaults {
  static readonly aliases = ['rs', 'reports stats']
  static override readonly description = `Statistics of vaults and installed plugins`
  static override readonly examples = [
    '<%= config.bin %> <%= command.id %> --path=/path/to/vaults',
    '<%= config.bin %> <%= command.id %> --path=/path/to/vaults/*/.obsidian',
    '<%= config.bin %> <%= command.id %> --path=/path/to/vaults/**/.obsidian',
  ]
  static override readonly flags = {
    output: outputFlag,
    ...this.commonFlags,
  }

  /**
   * Executes the command.
   * Parses the arguments and flags, and calls the action method.
   * Loads vaults, selects vaults, and gets stats about number of vaults and installed plugins per vault.
   * Handles errors and ensures flushing of logs.
   * @returns {Promise<void>}
   * @throws {Error} - Throws an error if the command fails.
   */
  public async run(): Promise<void> {
    try {
      const { args, flags } = await this.parse(Stats)
      await action(
        args,
        flagsInterceptor<FactoryFlagsWithVaults<StatsFlags>>(flags),
      )
    } catch (error) {
      this.handleError(error)
      throw error
    } finally {
      flush()
    }
  }
}
