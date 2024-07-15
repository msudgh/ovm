import {Flags, flush, handle} from '@oclif/core'
import {ArgInput} from '@oclif/core/lib/parser'
import {eachSeries} from 'async'
import {Vault} from 'obsidian-utils'
import {Config, loadConfig} from '../../providers/config'
import FactoryCommand from '../../providers/factoryCommand'
import {listInstalledPlugins, removePluginDir} from '../../services/plugins'
import {vaultsSelector} from '../../services/vaults'
import {logger} from '../../utils/logger'

const description = `Prune plugins for Obsidian vaults.`

type CustomFlags = {
  debug: boolean
  path: string
}

interface PrunePluginVaultOpts {
  vault: Vault
  config: Config
}

/**
 * PrunePlugins class is responsible for pruning unused plugins from Obsidian vaults.
 * It extends the FactoryCommand class and provides functionality to list and remove
 * plugins that are not referenced in the configuration.
 */
export default class PrunePlugins extends FactoryCommand {
  static readonly aliases = ['pp']
  static override readonly description = description
  static override readonly examples = [
    '<%= config.bin %> <%= command.id %> --path=/path/to/vaults',
    '<%= config.bin %> <%= command.id %> --path=/path/to/vaults/*/.obsidian',
    '<%= config.bin %> <%= command.id %> --path=/path/to/vaults/**/.obsidian',
  ]
  static override readonly flags = {
    debug: Flags.boolean({
      char: 'd',
      default: false,
      description: 'Enable debugging mode',
    }),
    path: Flags.string({
      char: 'p',
      description:
        'Path or Glob pattern of vaults to prune plugins. Default: reads from Obsidian config per environment.',
      default: '',
    }),
  }

  /**
   * Executes the command.
   * Parses the arguments and flags, and calls the action method.
   * Handles errors and ensures flushing of logs.
   */
  public async run() {
    try {
      const {args, flags} = await this.parse(PrunePlugins)
      await this.action(args, flags)
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
  private async action(args: ArgInput, flags: CustomFlags): Promise<void> {
    const {debug, path} = flags

    if (debug) {
      logger.level = 'debug'
      logger.debug(`Command called`, {flags})
    }

    const vaults = await this.loadVaults(path)

    const selectedVaults = await vaultsSelector(vaults)
    const config = await loadConfig()
    const vaultsWithConfig = selectedVaults.map((vault) => ({vault, config}))
    const prunePluginsIterator = async (opts: PrunePluginVaultOpts) => {
      const {vault, config} = opts
      const childLogger = logger.child({vault})
      const installedPlugins = await listInstalledPlugins(vault.path)
      const referencedPlugins = config.plugins.map(({id}) => id)
      const toBePruned = installedPlugins.filter(({id}) => !referencedPlugins.includes(id))

      for (const plugin of toBePruned) {
        childLogger.debug(`Pruning plugin`, {plugin})
        await removePluginDir(plugin.id, vault.path)
      }

      childLogger.info(`Pruned ${toBePruned.length} plugins`)
    }

    eachSeries(vaultsWithConfig, prunePluginsIterator, (error) => {
      if (error) {
        logger.debug('Error pruning plugins', {error})
        handle(error)
      }
    })
  }
}
