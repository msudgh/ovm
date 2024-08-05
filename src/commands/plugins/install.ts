import { Args, Flags, flush, handle } from '@oclif/core'
import { eachSeries } from 'async'
import {
  installPluginFromGithub,
  isPluginInstalled,
  Vault,
} from 'obsidian-utils'
import FactoryCommand, { FactoryFlags } from '../../providers/command'
import { Config, safeLoadConfig, writeConfig } from '../../providers/config'
import {
  findPluginInRegistry,
  handleExceedRateLimitError,
} from '../../providers/github'
import { modifyCommunityPlugins } from '../../services/plugins'
import { vaultsSelector } from '../../services/vaults'
import { VAULTS_PATH_FLAG_DESCRIPTION } from '../../utils/constants'
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
  ]
  static override readonly flags = {
    path: Flags.string({
      char: 'p',
      description: VAULTS_PATH_FLAG_DESCRIPTION,
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
    } = await safeLoadConfig(flags.config)

    if (!loadConfigSuccess) {
      logger.error('Failed to load config', { error: loadConfigError })
      process.exit(1)
    }

    const vaults = await this.loadVaults(path)
    const selectedVaults = await vaultsSelector(vaults)

    // Check if pluginId is provided and install only that plugin
    const { pluginId } = args
    if (pluginId) {
      await this.installPluginInVaults(selectedVaults, config, flags, pluginId)
    } else {
      await this.installPluginsInVaults(selectedVaults, config, flags, enable)
    }
  }

  private async installPluginsInVaults(
    vaults: Vault[],
    config: Config,
    flags: FactoryFlags<InstallFlags>,
    specific = false,
  ) {
    const installVaultIterator = async (vault: Vault) => {
      logger.debug(`Install plugins for vault`, { vault })
      const installedPlugins = []
      const failedPlugins = []

      for (const stagePlugin of config.plugins) {
        const childLogger = logger.child({ plugin: stagePlugin, vault })

        const pluginInRegistry = await findPluginInRegistry(stagePlugin.id)
        if (!pluginInRegistry) {
          throw new PluginNotFoundInRegistryError(stagePlugin.id)
        }

        if (await isPluginInstalled(pluginInRegistry.id, vault.path)) {
          childLogger.info(`Plugin already installed`)
          continue
        }

        stagePlugin.version = stagePlugin.version ?? 'latest'

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

          if (flags.enable) {
            // Enable the plugin
            await modifyCommunityPlugins(stagePlugin, vault.path, 'enable')
          }

          if (specific) {
            // Add the plugin to the config
            const newPlugins = new Set([...config.plugins])
            const updatedConfig = { ...config, plugins: [...newPlugins] }
            await writeConfig(updatedConfig, flags.config)
          }

          childLogger.info(`Installed plugin`)
        } catch (error) {
          failedPlugins.push({
            repo: pluginInRegistry.repo,
            version: stagePlugin.version,
          })
          handleExceedRateLimitError(error)
          childLogger.error(`Failed to install plugin`, { error })
        }
      }

      installedPlugins.length &&
        logger.info(`Installed ${installedPlugins.length} plugins`, {
          vault,
        })

      return { installedPlugins, failedPlugins }
    }

    eachSeries(vaults, installVaultIterator, (error) => {
      if (error) {
        logger.debug('Error installing plugins', { error })
        handle(error)
      }
    })
  }

  private async installPluginInVaults(
    vaults: Vault[],
    config: Config,
    flags: FactoryFlags<InstallFlags>,
    pluginId: string,
  ) {
    const pluginInRegistry = await findPluginInRegistry(pluginId)
    if (!pluginInRegistry) {
      throw new PluginNotFoundInRegistryError(pluginId)
    }

    await this.installPluginsInVaults(
      vaults,
      { ...config, plugins: [{ id: pluginId }] },
      flags,
      true,
    )
  }
}
