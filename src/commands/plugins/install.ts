import {Flags, flush, handle} from '@oclif/core'
import {ArgInput} from '@oclif/core/lib/parser'
import {eachSeries} from 'async'
import {installPluginFromGithub, isPluginInstalled, Vault} from 'obsidian-utils'
import {Config, loadConfig} from '../../providers/config'
import FactoryCommand from '../../providers/factoryCommand'
import {findPluginInRegistry, handleExceedRateLimitError} from '../../providers/github'
import {vaultsSelector} from '../../services/vaults'
import {logger} from '../../utils/logger'

const description = `Install plugins for Obsidian vaults.`

type CustomFlags = {
  debug: boolean
  path: string
}

interface InstallPluginVaultOpts {
  vault: Vault
  config: Config
}

export default class InstallPlugins extends FactoryCommand {
  static readonly aliases = ['ip']
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
        'Path or Glob pattern of vaults to install plugins. Default: reads from Obsidian config per environment.',
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
      const {args, flags} = await this.parse(InstallPlugins)
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
          childLogger.debug(`Plugin already installed`)
          continue
        }

        try {
          await installPluginFromGithub(pluginInRegistry.repo, stagePlugin.version, vault.path)
          installedPlugins.push({repo: pluginInRegistry.repo, version: stagePlugin.version})
          childLogger.info(`Installed plugin`)
        } catch (error) {
          failedPlugins.push({repo: pluginInRegistry.repo, version: stagePlugin.version})
          handleExceedRateLimitError(error)
          childLogger.error(`Failed to install plugin`, {error})
        }
      }

      logger.info(`Installed ${installedPlugins.length} plugins`, {vault})

      return {installedPlugins, failedPlugins}
    }
    eachSeries(vaultsWithConfig, installVaultIterator, (error) => {
      if (error) {
        logger.debug('Error installing plugins', {error})
        handle(error)
      }
    })
  }
}
