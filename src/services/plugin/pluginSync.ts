import { each } from 'async'
import { syncPluginConfigToVault } from '../../providers/configSync'
import {
  getSelectedVaults,
  mapVaultsIteratorItem,
} from '../../providers/vaults'
import {
  FactoryFlagsWithVaults,
  PluginSyncArgs,
  PluginSyncCommandIterator,
  PluginSyncFlags,
} from '../../types/commands'
import { handlerCommandError } from '../../utils/command'
import { getFilteredSyncEntries } from '../../utils/config'
import { logger } from '../../utils/logger'
import { getSourceBaseDir, resolveSourcePath } from '../../utils/path'
import { loadConfig } from '../config'
import { ConfigSyncMergeStrategy } from '../config/index.types'

const syncPluginVaultIterator: PluginSyncCommandIterator = async (item) => {
  const { vault, config, flags } = item
  let synced = 0
  let skipped = 0

  const vaultEntries = getFilteredSyncEntries({
    config,
    vault,
    types: ['plugin'],
    pluginId: flags.pluginId,
  })

  for (const entry of vaultEntries) {
    if (!entry.pluginId) {
      logger.warn(`Plugin entry missing pluginId, skipping: ${entry.source}`)
      skipped++
      continue
    }

    try {
      const sourcePath = resolveSourcePath(
        entry.source,
        getSourceBaseDir(config, flags),
      )
      const result = await syncPluginConfigToVault({
        source: sourcePath,
        target: entry.target || 'data.json', // Default to data.json for plugins
        pluginId: entry.pluginId,
        vaultPath: vault.path,
        mergeStrategy: (entry.mergeStrategy ||
          flags.mergeStrategy) as ConfigSyncMergeStrategy,
        include: entry.include,
        exclude: entry.exclude,
        overwrite: flags.overwrite,
        backup: flags.backup,
        onlyIfInstalled: entry.onlyIfInstalled ?? flags.onlyInstalled,
      })

      if (result) {
        synced++
      } else {
        skipped++
      }
    } catch (error) {
      logger.error(
        `Failed to sync plugin config ${entry.source} to ${vault.name}:`,
        error,
      )
      skipped++
    }
  }

  return { synced, skipped }
}

const action = async (
  args: PluginSyncArgs,
  flags: FactoryFlagsWithVaults<PluginSyncFlags>,
  iterator: PluginSyncCommandIterator = syncPluginVaultIterator,
) => {
  const config = await loadConfig(flags.config)
  const selectedVaults = await getSelectedVaults(flags.path)

  logger.debug('Syncing plugins on selected vaults...', {
    vaults: selectedVaults.length,
  })

  const items = mapVaultsIteratorItem<
    PluginSyncArgs,
    FactoryFlagsWithVaults<PluginSyncFlags>
  >(selectedVaults, config, flags, args)

  const callback = (error?: Error | null) => {
    if (!error) {
      logger.info('Plugin config sync finished!')
      return { success: true }
    }
    handlerCommandError(error)
    return { success: false, error }
  }

  return each(items, iterator, callback)
}

export { action, syncPluginVaultIterator }
