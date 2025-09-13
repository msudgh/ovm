import { each } from 'async'
import { SyncConfigOptions, syncFileToVault } from '../../providers/sync'
import {
  getSelectedVaults,
  mapVaultsIteratorItem,
} from '../../providers/vaults'
import {
  FactoryFlagsWithVaults,
  VaultSyncArgs,
  VaultSyncCommandIterator,
  VaultSyncFlags,
} from '../../types/commands'
import { handlerCommandError } from '../../utils/command'
import { getFilteredSyncEntries } from '../../utils/config'
import { logger } from '../../utils/logger'
import { getSourceBaseDir, resolveSourcePath } from '../../utils/path'
import { loadConfig } from '../config'
import { SyncMergeStrategy } from '../config/index.types'

const syncVaultCoreIterator: VaultSyncCommandIterator = async (item) => {
  const { vault, config, flags } = item
  let synced = 0
  let skipped = 0

  const vaultEntries = getFilteredSyncEntries({
    config,
    vault,
    types: ['core', 'custom'],
  })

  for (const entry of vaultEntries) {
    try {
      const sourcePath = resolveSourcePath(
        entry.source,
        getSourceBaseDir(config, flags),
      )
      const options: SyncConfigOptions = {
        source: sourcePath,
        target: entry.target,
        type: entry.type,
        vaultPath: vault.path,
        mergeStrategy: (entry.mergeStrategy ||
          flags.mergeStrategy) as SyncMergeStrategy,
        include: entry.include,
        exclude: entry.exclude,
        overwrite: entry.overwrite ?? flags.overwrite,
        backup: entry.backup ?? flags.backup,
        // Core configs don't need onlyIfInstalled check
        onlyIfInstalled: false,
      }
      const result = await syncFileToVault(options)

      if (result) {
        synced++
      } else {
        skipped++
      }
    } catch (error) {
      logger.error(
        `Failed to sync core config ${entry.source} to ${vault.name}:`,
        error,
      )
      skipped++
    }
  }

  return { synced, skipped }
}

const action = async (
  args: VaultSyncArgs,
  flags: FactoryFlagsWithVaults<VaultSyncFlags>,
  iterator: VaultSyncCommandIterator = syncVaultCoreIterator,
) => {
  const config = await loadConfig(flags.config)
  const selectedVaults = await getSelectedVaults(flags.path)

  logger.debug('Syncing vault core configs on selected vaults...', {
    vaults: selectedVaults.length,
  })

  const items = mapVaultsIteratorItem<
    VaultSyncArgs,
    FactoryFlagsWithVaults<VaultSyncFlags>
  >(selectedVaults, config, flags, args)

  const callback = (error?: Error | null) => {
    if (!error) {
      logger.info('Vault core config sync finished!')
      return { success: true }
    }
    handlerCommandError(error)
    return { success: false, error }
  }

  return each(items, iterator, callback)
}

export { action, syncVaultCoreIterator }
