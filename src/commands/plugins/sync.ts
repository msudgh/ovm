import { Flags, flush } from '@oclif/core'
import { FactoryCommandWithVaults } from '../../providers/factory'
import { configSyncMergeStrategy } from '../../services/config'
import { action } from '../../services/plugin/pluginSync'
import { FactoryFlagsWithVaults, PluginSyncFlags } from '../../types/commands'
import { flagsInterceptor } from '../../utils/command'
import { DESCRIPTIONS } from '../../utils/constants'

export default class PluginSync extends FactoryCommandWithVaults {
  static readonly aliases = ['ps', 'plugins sync']
  static override readonly description = `Sync plugin configuration files (data.json)`
  static override readonly examples = [
    '<%= config.bin %> <%= command.id %> --path=/path/to/vaults/**/.obsidian',
    '<%= config.bin %> <%= command.id %> --plugin-id=calendar --no-backup',
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
    onlyInstalled: Flags.boolean({
      description: DESCRIPTIONS.onlyInstalled,
      default: true,
    }),
    pluginId: Flags.string({
      description: DESCRIPTIONS.performOnSpecificPlugin,
      required: false,
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
      const { args, flags } = await this.parse(PluginSync)
      await action(
        args,
        flagsInterceptor<FactoryFlagsWithVaults<PluginSyncFlags>>(flags),
      )
    } catch (error) {
      this.handleError(error)
      throw error
    } finally {
      flush()
    }
  }
}
