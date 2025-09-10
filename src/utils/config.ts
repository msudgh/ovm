import { Vault } from 'obsidian-utils'
import {
  Config,
  ConfigSyncEntry,
  ConfigSyncType,
} from '../services/config/index.types'

type GetFilteredSyncEntriesOptions = {
  config: Config
  vault: Vault
  types: ConfigSyncType[]
  pluginId?: string
}

export const getFilteredSyncEntries = ({
  config,
  vault,
  types,
  pluginId,
}: GetFilteredSyncEntriesOptions): ConfigSyncEntry[] => {
  const entries = config.configSync?.files || []

  // Filter by entry type
  let filteredEntries = entries.filter((entry) =>
    types.includes(entry.type as ConfigSyncType),
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
