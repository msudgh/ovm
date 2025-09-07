import { each } from 'async'
import { dirname, resolve } from 'path'
import { syncFileToVault } from '../../providers/configSync'
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
import { logger } from '../../utils/logger'
import { loadConfig } from '../config'
import { ConfigSyncMergeStrategy } from '../config/index.types'

const syncVaultCoreIterator: VaultSyncCommandIterator = async (item) => {
  const { vault, config, flags } = item
  let synced = 0
  let skipped = 0

  const entries = config.configSync?.files || []
  if (entries.length === 0) {
    return { synced, skipped }
  }

  // Filter only core and custom type entries (not plugin)
  const coreEntries = entries.filter(
    (entry) => entry.type === 'core' || entry.type === 'custom',
  )

  // Filter by vault
  const vaultName = vault.name
  const vaultEntries = coreEntries.filter(
    (entry) => !entry.vaults || entry.vaults.includes(vaultName),
  )

  // Get config base path for resolving relative source paths
  const configDir = dirname(resolve(flags.config || './ovm.json'))

  for (const entry of vaultEntries) {
    try {
      const sourcePath = resolve(configDir, entry.source)
      const result = await syncFileToVault({
        source: sourcePath,
        target: entry.target,
        type: entry.type,
        vaultPath: vault.path,
        mergeStrategy: (entry.mergeStrategy ||
          flags.mergeStrategy) as ConfigSyncMergeStrategy,
        include: entry.include,
        exclude: entry.exclude,
        overwrite: flags.overwrite,
        backup: flags.backup,
        // Core configs don't need onlyIfInstalled check
        onlyIfInstalled: false,
      })

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

  logger.debug('Syncing core vault configs on selected vaults...', {
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
