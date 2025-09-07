import { z } from 'zod'
import {
  ConfigSchema,
  ConfigSyncEntrySchema,
  configSyncMergeStrategy,
  configSyncType,
  PluginSchema,
} from '.'

export type Plugin = z.infer<typeof PluginSchema>
export type ConfigSyncType = (typeof configSyncType)[number]
export type ConfigSyncMergeStrategy = (typeof configSyncMergeStrategy)[number]
export type ConfigSyncEntry = z.infer<typeof ConfigSyncEntrySchema>
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
