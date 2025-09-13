import { ArgInput } from '@oclif/core/lib/interfaces'
import { each } from 'async'
import fastFolderSize from 'fast-folder-size'
import { filesize } from 'filesize'
import { existsSync } from 'fs'
import { readFile } from 'fs/promises'
import { isPluginInstalled, vaultPathToPluginsPath } from 'obsidian-utils'
import { join } from 'path'
import { promisify } from 'util'
import {
  getSelectedVaults,
  mapVaultsIteratorItem,
} from '../../providers/vaults'
import {
  FactoryFlagsWithVaults,
  InstalledPlugins,
  StatsArgs,
  StatsCommandCallback,
  StatsCommandCallbackResult,
  StatsCommandIterator,
  StatsFlags,
} from '../../types/commands'
import { handlerCommandError } from '../../utils/command'
import { logger } from '../../utils/logger'
import { loadConfig } from '../config'

const installedPlugins: InstalledPlugins = {}

const statsVaultIterator: StatsCommandIterator = async (item) => {
  const { vault, config } = item
  const childLogger = logger.child({
    vault: { path: vault.path, name: vault.name },
  })

  childLogger.debug(`Statistics for vault`)

  const stats = {
    configuredPlugins: config.plugins.length,
    installedPlugins: 0,
  }

  const pluginsDir = vaultPathToPluginsPath(vault.path)

  for (const stagePlugin of config.plugins) {
    const pluginDir = join(pluginsDir, stagePlugin.id)
    const pluginDirExists = existsSync(pluginDir)

    if (!pluginDirExists) {
      continue
    }
    const manifestFile = await readFile(pluginDir + '/manifest.json', 'utf8')
    const manifestVersion = (JSON.parse(manifestFile) as { version: string })
      .version
    const pluginDirSize = await promisify(fastFolderSize)(pluginDir)
    const pluginNameWithSize = `${stagePlugin.id}@${manifestVersion} (${filesize(pluginDirSize as number)})`

    if (await isPluginInstalled(stagePlugin.id, vault.path)) {
      stats.installedPlugins += 1
      installedPlugins[pluginNameWithSize] = [
        ...new Set([
          ...(installedPlugins[pluginNameWithSize] || []),
          vault.name,
        ]),
      ]
    }
  }

  return stats
}

const action = async (
  args: ArgInput,
  flags: FactoryFlagsWithVaults<StatsFlags>,
  iterator: StatsCommandIterator = statsVaultIterator,
  callback?: StatsCommandCallback,
) => {
  const config = await loadConfig(flags.config)
  const selectedVaults = await getSelectedVaults(flags.path)

  const items = mapVaultsIteratorItem<
    StatsArgs,
    FactoryFlagsWithVaults<StatsFlags>
  >(selectedVaults, config, flags, args)

  const statsVaultCallback = (error: Error | null | undefined) => {
    const result: StatsCommandCallbackResult = {
      success: false,
      error,
      totalStats: {
        totalVaults: selectedVaults.length,
        totalPlugins: config.plugins.length,
      },
      installedPlugins,
    }

    if (!error) {
      result.success = true

      const sortedInstalledPlugins = Object.entries(result.installedPlugins)
        .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
        .reduce<InstalledPlugins>((acc, [key, value]) => {
          acc[key] = value
          return acc
        }, {})

      const totalInstalledPlugins = Object.keys(sortedInstalledPlugins).length

      if (flags.output === 'table') {
        console.table(result.totalStats)

        if (totalInstalledPlugins > 0) {
          console.log(sortedInstalledPlugins)
        }
      } else if (flags.output === 'json') {
        console.log(JSON.stringify(result.totalStats, null, 2))

        if (totalInstalledPlugins > 0) {
          console.log(JSON.stringify(sortedInstalledPlugins, null, 2))
        }
      }

      return result
    }

    logger.debug('Error getting stats', { error })
    callback?.(error)
    handlerCommandError(error)

    return result
  }

  return each(items, iterator, statsVaultCallback)
}

export { action, statsVaultIterator }
