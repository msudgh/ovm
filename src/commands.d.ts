import { Vault } from 'obsidian-utils'
import { Config } from './providers/config'

export interface PruneFlags {
  path: string
}

export interface PrunePluginVaultOpts {
  vault: Vault
  config: Config
}

export interface InstallFlags {
  path: string
  enable: boolean
}

export interface InstallArgs {
  pluginId?: string
}

export interface InstallPluginVaultOpts {
  vault: Vault
  config: Config
}

export interface UninstallArgs {
  pluginId?: string
}

export interface UninstallFlags {
  path: string
}

export interface UninstallPluginVaultOpts {
  vault: Vault
  config: Config
}

export type CommandsExecutedOnVaults = Record<
  string,
  {
    success: null | boolean
    duration: string
    error: null | Error | string
  }
>
