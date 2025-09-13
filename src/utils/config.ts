import { Vault } from 'obsidian-utils'
import { Config, SyncEntry, SyncType } from '../services/config/index.types'

type GetFilteredSyncEntriesOptions = {
  config: Config
  vault: Vault
  types: SyncType[]
  pluginId?: string
}

export const getFilteredSyncEntries = ({
  config,
  vault,
  types,
  pluginId,
}: GetFilteredSyncEntriesOptions): SyncEntry[] => {
  const entries = config.sync?.files || []

  // Filter by entry type
  let filteredEntries = entries.filter((entry) =>
    types.includes(entry.type as SyncType),
  )

  // Filter by specific plugin if provided
  if (pluginId) {
    filteredEntries = filteredEntries.filter(
      (entry) => entry.pluginId === pluginId,
    )
  }

  // Filter by vault
  const vaultName = vault.name
  return filteredEntries.filter(
    (entry) => !entry.vaults || entry.vaults.includes(vaultName),
  )
}
