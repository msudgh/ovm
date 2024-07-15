import {readdir, rm} from 'fs/promises'
import {vaultPathToPluginsPath} from 'obsidian-utils'

export const removePluginDir = async (pluginId: string, vaultPath: string) => {
  const pluginPath = vaultPathToPluginsPath(vaultPath)
  const pluginDir = `${pluginPath}/${pluginId}`
  await rm(pluginDir, {recursive: true, force: true})
}

export const listInstalledPlugins = async (vaultPath: string) => {
  const pluginPath = vaultPathToPluginsPath(vaultPath)
  const plugins = await readdir(pluginPath)
  return plugins.map((plugin) => ({id: plugin}))
}
