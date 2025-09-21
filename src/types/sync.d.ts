import { SyncMergeStrategy, SyncType } from '../services/config/index.types'

export interface SyncConfigOptions {
  source: string
  target: string
  type: SyncType
  vaultPath: string
  pluginId?: string
  mergeStrategy: SyncMergeStrategy
  include?: string[]
  exclude?: string[]
  overwrite?: boolean
  backup?: boolean
  onlyIfInstalled?: boolean
}
