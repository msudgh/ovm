import { Args, Flags, flush, handle } from '@oclif/core'
import { eachSeries } from 'async'
import { isPluginInstalled, Vault } from 'obsidian-utils'
import FactoryCommand, { FactoryFlags } from '../../providers/command'
import { Config, Plugin, safeLoadConfig } from '../../providers/config'
import { pluginsSelector, removePluginDir } from '../../services/plugins'
import { vaultsSelector } from '../../services/vaults'
import { logger } from '../../utils/logger'

interface UninstallArgs {
  pluginId?: string
}

interface UninstallFlags {
  path: string
}

interface UninstallPluginVaultOpts {
  vault: Vault
  config: Config
}

/**
 * Uninstall command removes specified plugins from vaults.
 */
export default class Uninstall extends FactoryCommand {
  static readonly aliases = ['pu', 'plugins:uninstall']
  static override readonly description = `Uninstall plugin/s from specified vaults.`
  static override readonly examples = [
    '<%= config.bin %> <%= command.id %> --path=/path/to/vaults',
    '<%= config.bin %> <%= command.id %> --path=/path/to/vaults/*/.obsidian',
    '<%= config.bin %> <%= command.id %> --path=/path/to/vaults/**/.obsidian',
    '<%= config.bin %> <%= command.id %> id',
  ]
  static override readonly flags = {
    path: Flags.string({
      char: 'p',
      description:
        'Path or Glob pattern of vaults to uninstall plugins. Default: reads from Obsidian config per environment.',
      default: '',
    }),
    ...this.commonFlags,
  }
  static override readonly args = {
    pluginId: Args.string({
      description: 'Specific Plugin ID to install',
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
      await this.action(args, this.flagsInterceptor(flags))
    } catch (error) {
      this.handleError(error)
    } finally {
      flush()
    }
  }

  /**
   * Main action method for the command.
   * Loads vaults, selects vaults, and uninstall specified plugins.
   * @param {UninstallArgs} args - The arguments passed to the command.
   * @param {FactoryFlags} flags - The flags passed to the command.
   * @returns {Promise<void>}
   */
  private async action(
    args: UninstallArgs,
    flags: FactoryFlags<UninstallFlags>,
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

    // Check if pluginId is provided and uninstall only that plugin
    const { pluginId } = args
    if (pluginId) {
      await this.uninstallPluginInVaults(selectedVaults, pluginId)
    } else {
      const selectedPlugins = await pluginsSelector(config.plugins)
      await this.uninstallPluginsInVaults(selectedVaults, selectedPlugins)
    }
  }

  private async uninstallPluginsInVaults(vaults: Vault[], plugins: Plugin[]) {
    const uninstallVaultIterator = async (vault: Vault) => {
      logger.debug(`Uninstall plugins for vault`, { vault })

      const uninstalledPlugins = []
      const failedPlugins = []

      for (const stagePlugin of plugins) {
        const childLogger = logger.child({ plugin: stagePlugin, vault })

        if (!(await isPluginInstalled(stagePlugin.id, vault.path))) {
          childLogger.warn(`Plugin not installed`)
          continue
        }

        try {
          await removePluginDir(stagePlugin.id, vault.path)
          uninstalledPlugins.push(stagePlugin)
        } catch (error) {
          failedPlugins.push(stagePlugin)
          childLogger.error(`Failed to uninstall plugin`, { error })
        }
      }

      uninstalledPlugins.length &&
        logger.info(`Uninstalled ${uninstalledPlugins.length} plugins`, {
          vault,
        })

      return { uninstalledPlugins, failedPlugins }
    }

    eachSeries(vaults, uninstallVaultIterator, (error) => {
      if (error) {
        logger.debug('Error installing plugins', { error })
        handle(error)
      }
    })
  }

  private async uninstallPluginInVaults(vaults: Vault[], id: string) {
    await this.uninstallPluginsInVaults(vaults, [{ id }])
  }
}
