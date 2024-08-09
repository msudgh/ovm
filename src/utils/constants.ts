import { homedir } from 'os'
import path from 'path'
import { getVaultName, getVaultPath } from '../providers/vaults'
import { ReservedVariables } from '../types'

export const OVM_CONFIG_FILENAME = 'ovm.json'
export const DEFAULT_CONFIG_PATH = path.join(homedir(), OVM_CONFIG_FILENAME)
export const VAULTS_PATH_FLAG_DESCRIPTION =
  '[default: detect from Obsidian config] Path or Glob pattern of vaults to install plugins.'
export const RESERVED_VARIABLES: ReservedVariables = {
  0: getVaultPath,
  1: getVaultName,
}
