import { each } from 'async'
import { isPluginInstalled } from 'obsidian-utils'
import { deduplicatePlugins, removePluginDir } from '../../providers/plugins'
import {
  getSelectedVaults,
  mapVaultsIteratorItem,
} from '../../providers/vaults'
import {
  FactoryFlagsWithVaults,
  UninstallArgs,
  UninstallCommandCallback,
  UninstallCommandCallbackResult,
  UninstallCommandIterator,
  UninstallFlags,
} from '../../types/commands'
import { handlerCommandError } from '../../utils/command'
import { logger } from '../../utils/logger'
import { loadConfig, writeConfig } from '../config'
import { Plugin } from '../config/index.types'

const uninstallVaultIterator: UninstallCommandIterator = async (item) => {
  const { vault, config, flags, args } = item
  // Check if pluginId is provided and install only that plugin
  const stagedPlugins = args?.pluginId
    ? [{ id: args.pluginId }]
    : config.plugins
  const uninstalledPlugins: Plugin[] = []
  const failedPlugins: Plugin[] = []
  const result = { uninstalledPlugins, failedPlugins }

  for (const stagePlugin of stagedPlugins) {
    const childLogger = logger.child({ plugin: stagePlugin, vault })

    if (!(await isPluginInstalled(stagePlugin.id, vault.path))) {
      childLogger.warn(`Plugin not installed`)
      result.failedPlugins.push(stagePlugin)
      continue
    }

    try {
      await removePluginDir(stagePlugin.id, vault.path)

      const updatedPlugins = new Set([
        ...deduplicatePlugins(config.plugins, stagePlugin),
      ])
      const updatedConfig = { ...config, plugins: [...updatedPlugins] }

      await writeConfig(updatedConfig, flags.config)

      childLogger.info(`Uninstalled plugin`)
      result.uninstalledPlugins.push(stagePlugin)
    } catch (error) {
      childLogger.error(`Failed to uninstall plugin`, { error })
      result.failedPlugins.push(stagePlugin)
    }
  }

  if (uninstalledPlugins.length) {
    logger.info(`Uninstalled ${uninstalledPlugins.length} plugins`, { vault })
  }

  return result
}

const action = async (
  args: UninstallArgs,
  flags: FactoryFlagsWithVaults<UninstallFlags>,
  iterator: UninstallCommandIterator = uninstallVaultIterator,
  callback?: UninstallCommandCallback,
): Promise<void> => {
  const config = await loadConfig(flags.config)
  const selectedVaults = await getSelectedVaults(flags.path)

  const items = mapVaultsIteratorItem<
    UninstallArgs,
    FactoryFlagsWithVaults<UninstallFlags>
  >(selectedVaults, config, flags, args)

  const uninstallCommandCallback: UninstallCommandCallback = (error) => {
    const result: UninstallCommandCallbackResult = {
      success: false,
      error,
    }

    if (!error) {
      logger.info('Uninstalling plugins completed')
      result.success = true
      callback?.(null)

      return result
    }

    logger.debug('Error uninstalling plugins', { error })

    callback?.(error)
    handlerCommandError(error)

    return result
  }

  return each(items, iterator, uninstallCommandCallback)
}

export { action, uninstallVaultIterator }
