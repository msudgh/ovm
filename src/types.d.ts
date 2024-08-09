import { Vault } from 'obsidian-utils'

export type CommandOnVault = (_vault: Vault, ..._args: string[]) => string
export type ReservedVariables = {
  [key: string]: CommandOnVault
}
