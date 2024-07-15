import { ExitPromptError } from '@inquirer/core'
import { Command, Flags, flush, handle } from '@oclif/core'
import { ArgInput } from '@oclif/core/lib/parser'
import { eachSeries } from 'async'
import { Vault } from 'obsidian-utils'
import { Config, loadConfig } from '../../providers/config'
import { listInstalledPlugins, removePluginDir } from '../../services/plugins'
import { findVaultsByPatternMatching, findVaultsFromConfig, vaultsSelector } from '../../services/vaults'
import { logger } from '../../utils/logger'

const description = `Prune plugins for Obsidian vaults.`

type CustomFlags = {
  debug: boolean
  path: string
}

interface PrunePluginVaultOpts {
  vault: Vault
  config: Config
}

export default class PrunePlugins extends Command {
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

    eachSeries(vaultsWithConfig, this.prune, (error) => {
      if (error) {
        logger.debug('Error pruning plugins', {error})
        handle(error)
      }
    })
  }

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

  private async prune({vault, config}: PrunePluginVaultOpts) {
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

  private handleError(error: unknown) {
    if (error instanceof ExitPromptError) {
      logger.debug('Exit prompt error:', {error})
    } else if (error instanceof Error) {
      logger.debug('An error occurred while pruning:', {error})
      handle(error)
    }
  }
}
