import { each } from 'async'
import { existsSync, lstatSync } from 'fs'
import { Vault } from 'obsidian-utils'
import { join } from 'path'
import { syncPluginConfigToVault } from '../../providers/sync'
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
import { PLUGIN_CONFIG_FILE_NAME } from '../../utils/constants'
import { logger } from '../../utils/logger'
import { getSourceBaseDir, resolveSourcePath } from '../../utils/path'
import { loadConfig } from '../config'
import { SyncEntry, SyncMergeStrategy } from '../config/index.types'

const isEntryTargetValidPlugin = (vault: Vault, entry: SyncEntry): boolean => {
  // Basic validation: target should not be empty and should not contain invalid characters
  if (!entry.target || /[<>:"|?*]/.test(entry.target)) {
    return false
  }
  const pluginPath = join(
    vault.path,
    '.obsidian',
    'plugins',
    entry.pluginId as string,
  )
  if (existsSync(pluginPath)) {
    try {
      if (!lstatSync(pluginPath).isDirectory()) {
        logger.warn(
          `Plugin ${entry.pluginId} has invalid structure in vault ${vault.name}, skipping entry ${entry.source}`,
        )
        return false
      }
    } catch (e) {
      // If lstatSync throws for any reason, skip
      logger.warn(
        `Unable to stat plugin path for ${entry.pluginId} in vault ${vault.name}, skipping entry ${entry.source}`,
        { error: (e as Error).message },
      )
      return false
    }
  }
  return true
}

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

    // If plugin path exists but is not a directory, treat as corrupted and skip
    if (!isEntryTargetValidPlugin(vault, entry)) {
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
        target: entry.target || PLUGIN_CONFIG_FILE_NAME,
        pluginId: entry.pluginId,
        vaultPath: vault.path,
        mergeStrategy: (entry.mergeStrategy ||
          flags.mergeStrategy) as SyncMergeStrategy,
        include: entry.include,
        exclude: entry.exclude,
        overwrite: entry.overwrite ?? flags.overwrite,
        backup: entry.backup ?? flags.backup,
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

      // Propagate error
      throw error as Error
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
