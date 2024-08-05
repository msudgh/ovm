import { homedir } from 'os'
import path from 'path'

export const OVM_CONFIG_FILENAME = 'ovm.json'
export const DEFAULT_CONFIG_PATH = path.join(homedir(), OVM_CONFIG_FILENAME)
export const VAULTS_PATH_FLAG_DESCRIPTION =
  '[default: detect from Obsidian config] Path or Glob pattern of vaults to install plugins.'
