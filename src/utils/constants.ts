import { homedir } from 'os'
import path from 'path'
import { getVaultName, getVaultPath } from '../providers/vaults'
import { syncMergeStrategy } from '../services/config'
import { ReservedVariables } from '../types/commands'
import { outputFormats } from './flags'

export const OVM_CONFIG_FILENAME = 'ovm.json'
export const DEFAULT_CONFIG_PATH = path.join(homedir(), OVM_CONFIG_FILENAME)
export const RESERVED_VARIABLES: ReservedVariables = {
  '0': getVaultPath,
  '1': getVaultName,
}
export const DESCRIPTIONS = {
  debug: 'Enable debug mode',
  timestamp: 'Enable timestamp in logs',
  config: 'Path to the configuration file',
  output: `Display the output with a specific transformer (${outputFormats.join(', ')})`,
  path: '[default: detect from Obsidian config] Path or Glob pattern of vaults to install plugins.',
  overwrite: 'Overwrite existing files without prompting',
  backup: 'Create .bak backup if destination exists',
  onlyInstalled: 'Skip vaults where plugin is not installed',
  mergeStrategy: `Strategy for merging configs: ${syncMergeStrategy.join(', ')}`,
  performOnSpecificPlugin: 'Perform action only on the specified plugin',
}
