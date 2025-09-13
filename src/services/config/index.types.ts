import { z } from 'zod'
import {
  ConfigSchema,
  PluginSchema,
  syncEntrySchema,
  syncMergeStrategy,
  syncType,
} from '.'

export type Plugin = z.infer<typeof PluginSchema>
export type SyncType = (typeof syncType)[number]
export type SyncMergeStrategy = (typeof syncMergeStrategy)[number]
export type SyncEntry = z.infer<typeof syncEntrySchema>
export type Config = z.infer<typeof ConfigSchema>
export type SafeLoadConfigResultSuccess = {
  success: true
  data: Config
  error: undefined
}
export type SafeLoadConfigResultError = {
  success: false
  data: undefined
  error: Error
}
export type SafeLoadConfigResult =
  | ({
      success: boolean
    } & SafeLoadConfigResultSuccess)
  | SafeLoadConfigResultError
