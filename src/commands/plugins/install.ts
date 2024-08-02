import { Args, Flags, flush, handle } from '@oclif/core'
import { eachSeries } from 'async'
import {
  installPluginFromGithub,
  isPluginInstalled,
  Vault,
} from 'obsidian-utils'
import FactoryCommand, { FactoryFlags } from '../../providers/command'
import { Config, Plugin, safeLoadConfig, writeConfig } from '../../providers/config'
import {
  findPluginInRegistry,
  handleExceedRateLimitError,
} from '../../providers/github'
import { modifyCommunityPlugins } from '../../services/plugins'
import { vaultsSelector } from '../../services/vaults'
import { PluginNotFoundInRegistryError } from '../../utils/errors'
import { logger } from '../../utils/logger'

interface InstallFlags {
  path: string
  enable: boolean
}

interface InstallArgs {
  pluginId?: string
}

interface InstallPluginVaultOpts {
  vault: Vault
  config: Config
}

/**
 * Install command installs specified plugins in vaults.
 */
export default class Install extends FactoryCommand {
  static readonly aliases = ['pi', 'plugins:install']
  static override readonly description = `Install plugin/s in specified vaults.`
  static override readonly examples = [
    '<%= config.bin %> <%= command.id %> --path=/path/to/vaults',
    '<%= config.bin %> <%= command.id %> --path=/path/to/vaults/*/.obsidian',
    '<%= config.bin %> <%= command.id %> --path=/path/to/vaults/**/.obsidian',
    '<%= config.bin %> <%= command.id %> id',
    '<%= config.bin %> <%= command.id %> id@version',
  ]
  static override readonly flags = {
    path: Flags.string({
      char: 'p',
      description:
        'Path or Glob pattern of vaults to install plugins. (default: detects vaults from Obsidian configuration)',
      default: '',
    }),
    enable: Flags.boolean({
      char: 'e',
      description: 'Enable all chosen plugins',
      default: true,
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
      const { args, flags } = await this.parse(Install)
      await this.action(args, this.flagsInterceptor(flags))
    } catch (error) {
      this.handleError(error)
    } finally {
      flush()
    }
  }

  /**
   * Main action method for the command.
   * Loads vaults, selects vaults, and install specified plugins.
   * @param {InstallArgs} args - The arguments passed to the command.
   * @param {FactoryFlags<InstallFlags>} flags - The flags passed to the command.
   * @returns {Promise<void>}
   */
  private async action(
    args: InstallArgs,
    flags: FactoryFlags<InstallFlags>,
  ): Promise<void> {
    const { path, enable } = flags
    const {
      success: loadConfigSuccess,
      data: config,
      error: loadConfigError,
    } = await safeLoadConfig()

    if (!loadConfigSuccess) {
      logger.error('Failed to load config', { error: loadConfigError })
      process.exit(1)
    }

    const vaults = await this.loadVaults(path)
    const selectedVaults = await vaultsSelector(vaults)

    // Check if pluginId is provided and install only that plugin
    const { pluginId } = args
    if (pluginId) {
      await this.installPluginInVaults(selectedVaults, pluginId, enable)
    } else {
      await this.installPluginsInVaults(selectedVaults, config.plugins, enable)
    }
  }

  private async installPluginsInVaults(
    vaults: Vault[],
    plugins: Plugin[],
    enable: boolean,
    specific = false,
  ) {
    const installVaultIterator = async (vault: Vault) => {
      logger.debug(`Install plugins for vault`, { vault })
      const installedPlugins = []
      const failedPlugins = []

      for (const stagePlugin of plugins) {
        const childLogger = logger.child({ stagePlugin, vault })

        const pluginInRegistry = await findPluginInRegistry(stagePlugin.id)
        if (!pluginInRegistry) {
          throw new PluginNotFoundInRegistryError(stagePlugin.id)
        }

        if (await isPluginInstalled(pluginInRegistry.id, vault.path)) {
          childLogger.info(`Plugin already installed`)
          continue
        }

       stagePlugin.version = stagePlugin.version ?? 'latest';

        try {
          await installPluginFromGithub(
            pluginInRegistry.repo,
            stagePlugin.version,
            vault.path,
          )
          installedPlugins.push({
            repo: pluginInRegistry.repo,
            version: stagePlugin.version,
          })

          if (enable) {
            // Enable the plugin
            await modifyCommunityPlugins(stagePlugin, vault.path, 'enable')
          }

          if (specific) {
            // Add the plugin to the config
            const newPlugins = new Set([...plugins])
            await writeConfig({ plugins: [...newPlugins] })
          }

          childLogger.debug(`Installed plugin`)
        } catch (error) {
          failedPlugins.push({
            repo: pluginInRegistry.repo,
            version: stagePlugin.version,
          })
          handleExceedRateLimitError(error)
          childLogger.error(`Failed to install plugin`, { error })
        }
      }

      if (installedPlugins.length > 0) {
        logger.info(`Installed ${installedPlugins.length} plugins`, {
          vault,
        })
      }

      return { installedPlugins, failedPlugins }
    }

    eachSeries(vaults, installVaultIterator, (error) => {
      if (error) {
        logger.debug('Error installing plugins', { error })
        handle(error)
      }
    })
  }

  private async installPluginInVaults(vaults: Vault[], id: string, enable: boolean) {
    const pluginInRegistry = await findPluginInRegistry(id)
    if (!pluginInRegistry) {
      throw new PluginNotFoundInRegistryError(id)
    }

    await this.installPluginsInVaults(vaults, [{ id }], enable, true)
  }
}
