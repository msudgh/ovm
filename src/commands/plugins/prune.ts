import { Flags, flush, handle } from '@oclif/core'
import { ArgInput } from '@oclif/core/lib/parser'
import { eachSeries } from 'async'
import { Vault } from 'obsidian-utils'
import FactoryCommand, { FactoryFlags } from '../../providers/command'
import { Config, safeLoadConfig } from '../../providers/config'
import { listInstalledPlugins, removePluginDir } from '../../services/plugins'
import { vaultsSelector } from '../../services/vaults'
import { VAULTS_PATH_FLAG_DESCRIPTION } from '../../utils/constants'
import { logger } from '../../utils/logger'

interface PruneFlags {
  path: string
}

interface PrunePluginVaultOpts {
  vault: Vault
  config: Config
}

/**
 * Prune command list and remove plugins that aren't referred in config file.
 */
export default class Prune extends FactoryCommand {
  static readonly aliases = ['pp', 'plugins:prune']
  static override readonly description = `Prune existing plugin(s) from vaults that are unspecified in the config file.`
  static override readonly examples = [
    '<%= config.bin %> <%= command.id %> --path=/path/to/vaults',
    '<%= config.bin %> <%= command.id %> --path=/path/to/vaults/*/.obsidian',
    '<%= config.bin %> <%= command.id %> --path=/path/to/vaults/**/.obsidian',
  ]
  static override readonly flags = {
    path: Flags.string({
      char: 'p',
      description: VAULTS_PATH_FLAG_DESCRIPTION,
      default: '',
    }),
    ...this.commonFlags,
  }

  /**
   * Executes the command.
   * Parses the arguments and flags, and calls the action method.
   * Handles errors and ensures flushing of logs.
   */
  public async run() {
    try {
      const { args, flags } = await this.parse(Prune)
      await this.action(args, this.flagsInterceptor(flags))
    } catch (error) {
      this.handleError(error)
    } finally {
      flush()
    }
  }

  /**
   * Main action method for the command.
   * Loads vaults, selects vaults, loads configuration, and prunes unused plugins.
   * @param {ArgInput} args - The arguments passed to the command.
   * @param {CustomFlags} flags - The flags passed to the command.
   * @returns {Promise<void>}
   */
  private async action(
    args: ArgInput,
    flags: FactoryFlags<PruneFlags>,
  ): Promise<void> {
    const { path } = flags
    const {
      success: loadConfigSuccess,
      data: config,
      error: loadConfigError,
    } = await safeLoadConfig(flags.config)

    if (!loadConfigSuccess) {
      logger.error('Failed to load config', { error: loadConfigError })
      process.exit(1)
    }

    const vaults = await this.loadVaults(path)
    const selectedVaults = await vaultsSelector(vaults)
    const vaultsWithConfig = selectedVaults.map((vault) => ({ vault, config }))
    const prunePluginsIterator = async (opts: PrunePluginVaultOpts) => {
      const { vault, config } = opts
      const childLogger = logger.child({ vault })
      const installedPlugins = await listInstalledPlugins(vault.path)
      const referencedPlugins = config.plugins.map(({ id }) => id)
      const toBePruned = installedPlugins.filter(
        ({ id }) => !referencedPlugins.includes(id),
      )

      for (const plugin of toBePruned) {
        childLogger.debug(`Pruning plugin`, { plugin })
        await removePluginDir(plugin.id, vault.path)
      }

      childLogger.info(`Pruned ${toBePruned.length} plugins`)
    }

    eachSeries(vaultsWithConfig, prunePluginsIterator, (error) => {
      if (error) {
        logger.debug('Error pruning plugins', { error })
        handle(error)
      }
    })
  }
}
