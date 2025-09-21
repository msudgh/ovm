import { GitHubPluginVersion } from 'obsidian-utils'
import { Plugin } from '../services/config/index.types'

export const getPluginVersion = (plugin?: Plugin): GitHubPluginVersion =>
  plugin?.version ?? 'latest'
