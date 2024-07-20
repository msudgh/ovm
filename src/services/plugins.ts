import { checkbox } from '@inquirer/prompts'
import { readdir, readFile, rm, writeFile } from 'fs/promises'
import { vaultPathToPluginsPath } from 'obsidian-utils'
import { Plugin } from '../providers/config'
import { logger } from '../utils/logger'

export type InstalledPlugins = Record<string, Array<string>>

export const removePluginDir = async (pluginId: string, vaultPath: string) => {
  const childLogger = logger.child({ pluginId, vaultPath })
  const pluginsPath = vaultPathToPluginsPath(vaultPath)
  const pluginDir = `${pluginsPath}/${pluginId}`

  childLogger.debug(`Remove plugin`, { pluginId, pluginDir, pluginsPath })

  await rm(pluginDir, { recursive: true, force: true })

  childLogger.info(`Removed plugin`)
}

export const listInstalledPlugins = async (vaultPath: string) => {
  const pluginPath = vaultPathToPluginsPath(vaultPath)
  const plugins = await readdir(pluginPath)
  return plugins.map((plugin) => ({ id: plugin }))
}

export const pluginsSelector = async (plugins: Plugin[]) => {
  const choices = plugins
    .map((plugin) => ({
      name: plugin.id,
      value: plugin,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))

  const selectedPlugins = await checkbox({
    choices,
    message: 'Select the plugins:',
    validate: (selected) => selected.length > 0 || 'At least one plugin must be selected',
    required: true,
  })

  logger.debug('selectedPlugins', { selectedPlugins })

  return selectedPlugins
}

export const modifyCommunityPlugins = async (plugin: Plugin, vaultPath: string, action: 'enable' | 'disable') => {
  const childLogger = logger.child({ plugin, vaultPath, action })

  childLogger.debug(`Modify community plugins json`)

  const communityPluginsDir = `${vaultPath}/.obsidian/community-plugins.json`
  const content = await readFile(communityPluginsDir)
  let plugins = JSON.parse(content.toString()) as string[]

  if (action === 'enable') {
    plugins.push(plugin.id)
  } else {
    plugins = plugins.filter((p) => p !== plugin.id)
  }

  await writeFile(communityPluginsDir, JSON.stringify(plugins, null, 2))

  childLogger.debug(`Modify action performed`)
}
