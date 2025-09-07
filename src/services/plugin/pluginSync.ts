import { each } from 'async'
import { dirname, resolve } from 'path'
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
import { logger } from '../../utils/logger'
import { loadConfig } from '../config'
import { ConfigSyncEntry, ConfigSyncMergeStrategy } from '../config/index.types'

const syncPluginVaultIterator: PluginSyncCommandIterator = async (item) => {
  const { vault, config, flags } = item
  let synced = 0
  let skipped = 0

  const entries = config.configSync?.files || []
  if (entries.length === 0) {
    return { synced, skipped }
  }

  // Filter only plugin type entries
  const pluginEntries = entries.filter(
    (entry: ConfigSyncEntry) => entry.type === 'plugin',
  )

  // Filter by specific plugin if provided
  const filteredEntries = flags.pluginId
    ? pluginEntries.filter((entry) => entry.pluginId === flags.pluginId)
    : pluginEntries

  // Filter by vault
  const vaultName = vault.name
  const vaultEntries = filteredEntries.filter(
    (entry: ConfigSyncEntry) =>
      !entry.vaults || entry.vaults.includes(vaultName),
  )

  // Get config base path for resolving relative source paths
  const configDir = dirname(resolve(flags.config || './ovm.json'))

  for (const entry of vaultEntries) {
    if (!entry.pluginId) {
      logger.warn(`Plugin entry missing pluginId, skipping: ${entry.source}`)
      skipped++
      continue
    }

    try {
      const sourcePath = resolve(configDir, entry.source)
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

  logger.debug('Syncing plugin configs on selected vaults...', {
    vaults: selectedVaults.length,
    pluginId: flags.pluginId || 'all plugins',
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
