import { Flags, flush, handle } from '@oclif/core'
import { ArgInput } from '@oclif/core/lib/parser'
import { eachSeries, ErrorCallback } from 'async'
import { isPluginInstalled, Vault } from 'obsidian-utils'
import FactoryCommand, { FactoryFlags } from '../../providers/command'
import { Config, safeLoadConfig } from '../../providers/config'
import { InstalledPlugins } from '../../services/plugins'
import { vaultsSelector } from '../../services/vaults'
import { logger } from '../../utils/logger'

interface StatsFlags {
  path: string
  output: string
}

export default class Stats extends FactoryCommand {
  static readonly aliases = ['rs', 'reports:stats']
  static override readonly description = `Stats of vaults and installed plugins.`
  static override readonly examples = [
    '<%= config.bin %> <%= command.id %> --path=/path/to/vaults',
    '<%= config.bin %> <%= command.id %> --path=/path/to/vaults/*/.obsidian',
    '<%= config.bin %> <%= command.id %> --path=/path/to/vaults/**/.obsidian',
  ]
  static override readonly flags = {
    path: Flags.string({
      char: 'p',
      description:
        'Path or Glob pattern of vaults to get stats from. Default: reads from Obsidian per vault config per environment.',
      default: '',
    }),
    output: Flags.string({
      char: 'o',
      description: 'Display the output with a specific transformer.',
      default: 'table',
      options: ['table', 'json'],
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
      const { args, flags } = await this.parse(Stats)
      await this.action(args, this.flagsInterceptor(flags))
    } catch (error) {
      this.handleError(error)
    } finally {
      flush()
    }
  }

  /**
   * Main action method for the command.
   * Loads vaults, selects vaults, and gets stats about number of vaults and installed plugins per vault.
   * @param {ArgInput} args - The arguments passed to the command.
   * @param {FactoryFlags<StatsFlags>} flags - The flags passed to the command.
   * @returns {Promise<void>}
   */
  private async action(
    args: ArgInput,
    flags: FactoryFlags<StatsFlags>,
  ): Promise<void> {
    const { path, output } = flags
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

    const installedPlugins: InstalledPlugins = {}

    const statsVaultIterator = async (opts: {
      vault: Vault
      config: Config
    }) => {
      const { vault, config } = opts
      logger.debug(`Checking stats for vault`, { vault })

      for (const stagePlugin of config.plugins) {
        if (await isPluginInstalled(stagePlugin.id, vault.path)) {
          installedPlugins[stagePlugin.id] = [
            ...(installedPlugins[stagePlugin.id] || []),
            vault.name,
          ]
        }
      }
    }

    const statsVaultErrorCallback: ErrorCallback<Error> = (error) => {
      if (error) {
        logger.debug('Error getting stats', { error })
        handle(error)
        return error
      } else {
        const totalStats = {
          totalVaults: selectedVaults.length,
          totalPlugins: config.plugins.length,
        }

        if (output === 'table') {
          console.table(totalStats)
          console.table(installedPlugins)
        } else if (output === 'json') {
          console.log(JSON.stringify(totalStats, null, 2))
          console.log(JSON.stringify(installedPlugins, null, 2))
        }
      }
    }

    eachSeries(vaultsWithConfig, statsVaultIterator, statsVaultErrorCallback)
  }
}
