import {Flags, flush, handle} from '@oclif/core'
import {ArgInput} from '@oclif/core/lib/parser'
import {eachSeries} from 'async'
import {isPluginInstalled, Vault} from 'obsidian-utils'
import {Config, loadConfig} from '../../providers/config'
import FactoryCommand from '../../providers/factoryCommand'
import {handleExceedRateLimitError} from '../../providers/github'
import {pluginsSelector, removePluginDir} from '../../services/plugins'
import {vaultsSelector} from '../../services/vaults'
import {logger} from '../../utils/logger'

const description = `Uninstall plugins for Obsidian vaults.`

type CustomFlags = {
  debug: boolean
  path: string
}

interface UninstallPluginVaultOpts {
  vault: Vault
  config: Config
}

/**
 * UninstallPlugins class is responsible for uninstalling plugins from Obsidian vaults.
 * It provides functionality to remove specified plugins.
 */
export default class UninstallPlugins extends FactoryCommand {
  static readonly aliases = ['up']
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
        'Path or Glob pattern of vaults to uninstall plugins. Default: reads from Obsidian config per environment.',
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
      const {args, flags} = await this.parse(UninstallPlugins)
      await this.action(args, flags)
    } catch (error) {
      this.handleError(error)
    } finally {
      flush()
    }
  }

  /**
   * Main action method for the command.
   * Loads vaults, selects vaults, and uninstall specified plugins.
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
    const uninstallVaultIterator = async (opts: UninstallPluginVaultOpts) => {
      const {vault, config} = opts
      logger.debug(`Uninstall plugins for vault`, {vault})

      const uninstalledPlugins = []
      const failedPlugins = []

      const selectedPlugins = await pluginsSelector(config.plugins)

      for (const stagePlugin of selectedPlugins) {
        const childLogger = logger.child({stagePlugin, vault})

        if (!(await isPluginInstalled(stagePlugin.id, vault.path))) {
          childLogger.debug(`Plugin not installed`)
          continue
        }

        try {
          await removePluginDir(stagePlugin.id, vault.path)
          uninstalledPlugins.push(stagePlugin)
        } catch (error) {
          failedPlugins.push(stagePlugin)
          handleExceedRateLimitError(error)
          childLogger.error(`Failed to uninstall plugin`, {error})
        }
      }

      logger.info(`Uninstalled ${uninstalledPlugins.length} plugins`, {vault})

      return {uninstalledPlugins, failedPlugins}
    }

    eachSeries(vaultsWithConfig, uninstallVaultIterator, (error) => {
      if (error) {
        logger.debug('Error installing plugins', {error})
        handle(error)
      }
    })
  }
}
