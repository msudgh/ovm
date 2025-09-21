import { ArgInput } from '@oclif/core/lib/parser'
import { each } from 'async'
import {
  listInstalledPlugins,
  modifyCommunityPlugins,
  removePluginDir,
} from '../../providers/plugins'
import {
  getSelectedVaults,
  mapVaultsIteratorItem,
} from '../../providers/vaults'
import {
  FactoryFlagsWithVaults,
  PruneArgs,
  PruneCommandCallback,
  PruneCommandCallbackResult,
  PruneCommandIterator,
  PruneCommandIteratorResult,
  PruneFlags,
} from '../../types/commands'
import { handlerCommandError } from '../../utils/command'
import { logger } from '../../utils/logger'
import { loadConfig } from '../config'

const pruneVaultIterator: PruneCommandIterator = async (item) => {
  const { vault, config } = item
  const childLogger = logger.child({ vault })
  const result: PruneCommandIteratorResult = { prunedPlugins: [] }

  const installedPlugins = await listInstalledPlugins(vault.path)
  const referencedPlugins = config.plugins.map(({ id }) => id)
  const toBePruned = installedPlugins.filter(
    ({ id }) => !referencedPlugins.includes(id),
  )

  for (const plugin of toBePruned) {
    await removePluginDir(plugin.id, vault.path)
    await modifyCommunityPlugins({ id: plugin.id }, vault.path, 'disable')
  }

  childLogger.info(`Pruned ${toBePruned.length} plugins`, {
    vault,
    plugins: toBePruned.map(({ id }) => id),
  })

  result.prunedPlugins = toBePruned

  return result
}

const action = async (
  args: ArgInput,
  flags: FactoryFlagsWithVaults<PruneFlags>,
  iterator: PruneCommandIterator = pruneVaultIterator,
  callback?: PruneCommandCallback,
): Promise<void> => {
  const config = await loadConfig(flags.config)
  const selectedVaults = await getSelectedVaults(flags.path)
  const items = mapVaultsIteratorItem<
    PruneArgs,
    FactoryFlagsWithVaults<PruneFlags>
  >(selectedVaults, config, flags, args)

  const pruneCommandCallback: PruneCommandCallback = (error) => {
    const result: PruneCommandCallbackResult = {
      success: false,
      error,
    }

    if (!error) {
      result.success = true
      logger.info('Pruning plugins completed')
      callback?.(error)

      return result
    }

    logger.error('Pruning plugins failed', { error })
    callback?.(error)
    handlerCommandError(error)

    return result
  }

  return each(items, iterator, pruneCommandCallback)
}

export { action, pruneVaultIterator }
