import { Flags, flush } from '@oclif/core'
import { FactoryCommandWithVaults } from '../../providers/factory'
import { configSyncMergeStrategy } from '../../services/config'
import { action } from '../../services/vault/vaultSync'
import { FactoryFlagsWithVaults, VaultSyncFlags } from '../../types/commands'
import { flagsInterceptor } from '../../utils/command'
import { DESCRIPTIONS } from '../../utils/constants'

export default class VaultSync extends FactoryCommandWithVaults {
  static readonly aliases = ['vs', 'vaults sync']
  static override readonly description = `Sync core and custom vault configuration files`
  static override readonly examples = [
    '<%= config.bin %> <%= command.id %> --path=/path/to/vaults/**/.obsidian',
    '<%= config.bin %> <%= command.id %> --no-backup',
    '<%= config.bin %> <%= command.id %> --merge-strategy=smart',
  ]
  static override readonly flags = {
    overwrite: Flags.boolean({
      description: DESCRIPTIONS.overwrite,
      default: true,
    }),
    backup: Flags.boolean({
      description: DESCRIPTIONS.backup,
      default: true,
    }),
    mergeStrategy: Flags.string({
      description: DESCRIPTIONS.mergeStrategy,
      options: configSyncMergeStrategy,
      default: 'replace',
    }),
    ...this.commonFlagsWithPath,
  }

  public async run(): Promise<void> {
    try {
      const { args, flags } = await this.parse(VaultSync)
      await action(
        args,
        flagsInterceptor<FactoryFlagsWithVaults<VaultSyncFlags>>(flags),
      )
    } catch (error) {
      this.handleError(error)
      throw error
    } finally {
      flush()
    }
  }
}
