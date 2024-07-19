import { Flags, flush, handle } from '@oclif/core'
import { ArgInput } from '@oclif/core/lib/parser'
import { eachSeries } from 'async'
import { installPluginFromGithub, isPluginInstalled, Vault } from 'obsidian-utils'
import FactoryCommand, { FactoryFlags } from '../../providers/command'
import { Config, loadConfig } from '../../providers/config'
import { findPluginInRegistry, handleExceedRateLimitError } from '../../providers/github'
import { modifyCommunityPlugins } from '../../services/plugins'
import { vaultsSelector } from '../../services/vaults'
import { logger } from '../../utils/logger'

const description = `Install plugins in specified vaults.`

interface InstallFlags {
  path: string
  enable: boolean
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
  static override readonly description = description
  static override readonly examples = [
    '<%= config.bin %> <%= command.id %> --path=/path/to/vaults',
    '<%= config.bin %> <%= command.id %> --path=/path/to/vaults/*/.obsidian',
    '<%= config.bin %> <%= command.id %> --path=/path/to/vaults/**/.obsidian',
  ]
  static override readonly flags = {
    path: Flags.string({
      char: 'p',
      description:
        'Path or Glob pattern of vaults to install plugins. Default: reads from Obsidian config per environment.',
      default: '',
    }),
    enable: Flags.boolean({
      char: 'e',
      description: 'Enable the installed plugins',
      default: false,
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
      const {args, flags} = await this.parse(Install)
      await this.action(args, flags)
    } catch (error) {
      this.handleError(error)
    } finally {
      flush()
    }
  }

  /**
   * Main action method for the command.
   * Loads vaults, selects vaults, and install specified plugins.
   * @param {ArgInput} args - The arguments passed to the command.
   * @param {FactoryFlags<InstallFlags>} flags - The flags passed to the command.
   * @returns {Promise<void>}
   */
  private async action(args: ArgInput, flags: FactoryFlags<InstallFlags>): Promise<void> {
    this.flagsInterceptor(flags)

    const {path, enable} = flags
    const vaults = await this.loadVaults(path)
    const selectedVaults = await vaultsSelector(vaults)

    try {
      const config = (await loadConfig()) as Config
      const vaultsWithConfig = selectedVaults.map((vault) => ({vault, config}))
      const installVaultIterator = async (opts: InstallPluginVaultOpts) => {
        const {vault, config} = opts
        logger.debug(`Install plugins for vault`, {vault})
        const installedPlugins = []
        const failedPlugins = []

        for (const stagePlugin of config.plugins) {
          const childLogger = logger.child({stagePlugin, vault})

          const pluginInRegistry = await findPluginInRegistry(stagePlugin.id)
          if (!pluginInRegistry) {
            throw new Error(`Plugin ${stagePlugin.id} not found in registry`)
          }

          if (await isPluginInstalled(pluginInRegistry.id, vault.path)) {
            childLogger.info(`Plugin already installed`)
            continue
          }

          try {
            await installPluginFromGithub(pluginInRegistry.repo, stagePlugin.version, vault.path)
            installedPlugins.push({repo: pluginInRegistry.repo, version: stagePlugin.version})

            if (enable) {
              // Enable the plugin
              await modifyCommunityPlugins(stagePlugin, vault.path, 'enable')
            }

            childLogger.debug(`Installed plugin`)
          } catch (error) {
            failedPlugins.push({repo: pluginInRegistry.repo, version: stagePlugin.version})
            handleExceedRateLimitError(error)
            childLogger.error(`Failed to install plugin`, {error})
          }
        }

        if (installedPlugins.length > 0) {
          logger.info(`Installed ${installedPlugins.length} plugins`, {vault})
        }

        return {installedPlugins, failedPlugins}
      }
      eachSeries(vaultsWithConfig, installVaultIterator, (error) => {
        if (error) {
          logger.debug('Error installing plugins', {error})
          handle(error)
        }
      })
    } catch (error) {
      this.handleError(error)
    }
  }
}
