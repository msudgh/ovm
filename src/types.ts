import { Vault } from 'obsidian-utils'

type CommandOnVault = (vault: Vault, ...args: string[]) => string
export type ReservedVariables = {
  [key: string]: CommandOnVault
}
