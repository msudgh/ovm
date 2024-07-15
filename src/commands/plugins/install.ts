import { ExitPromptError } from '@inquirer/core'
import { Command, Flags, flush, handle } from '@oclif/core'
import { ArgInput } from '@oclif/core/lib/parser'
import { eachSeries } from 'async'
import { installPluginFromGithub, isPluginInstalled, Vault } from 'obsidian-utils'
import { Config, loadConfig } from '../../providers/config'
import { findPluginInRegistry, handleExceedRateLimitError } from '../../providers/github'
import { findVaultsByPatternMatching, findVaultsFromConfig, vaultsSelector } from '../../services/vaults'
import { logger } from '../../utils/logger'

const description = `Install plugins for Obsidian vaults.`

type CustomFlags = {
  debug: boolean
  path: string
}

interface InstallPluginVaultOpts {
  vault: Vault
  config: Config
}

export default class InstallPlugins extends Command {
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

  private async action(args: ArgInput, flags: CustomFlags) {
    const {debug, path} = flags

    if (debug) {
      logger.level = 'debug'
      logger.debug(`Command called`, {flags})
    }

    const vaults = await this.loadVaults(path)
    const selectedVaults = await vaultsSelector(vaults)
    const config = await loadConfig()
    const vaultsWithConfig = selectedVaults.map((vault) => ({vault, config}))

    eachSeries(vaultsWithConfig, this.install, (error) => {
      if (error) {
        logger.debug('Error installing plugins', {error})
        handle(error)
      }
    })
  }

  /**
   * Loads vaults based on the specified path or from the configuration.
   * If a path is specified, it will find vaults by pattern matching.
   * If no path is specified, it will find vaults from the Obsidian configuration.
   * Throws an error if no vaults are found.
   *
   * @param path - The path to search for vaults.
   * @returns A promise that resolves to an array of Vault objects.
   * @throws An error if no vaults are found.
   */
  private async loadVaults(path: string): Promise<Vault[]> {
    const isPathSpecifiedAndValid = path && path.trim().length > 0
    let vaults: Vault[] = []

    if (isPathSpecifiedAndValid) {
      vaults = await findVaultsByPatternMatching(path)
    } else {
      vaults = await findVaultsFromConfig()
    }

    if (vaults.length === 0) {
      throw new Error(`No vaults found!`)
    }

    return vaults
  }

  /**
   * Installs plugins for a given Obsidian vault and ovm config.
   * @param options - InstallPluginVaultOpts
   * @returns An object containing the list of installed plugins and the list of failed plugins.
   */
  private async install({vault, config}: InstallPluginVaultOpts) {
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

  private handleError(error: unknown) {
    if (error instanceof ExitPromptError) {
      logger.debug('Exit prompt error:', {error})
    } else if (error instanceof Error) {
      logger.debug('An error occurred while installation:', {error})
      handle(error)
    }
  }
}
