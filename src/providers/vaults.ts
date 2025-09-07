import { checkbox } from '@inquirer/prompts'
import { glob } from 'glob'
import { findVault, Vault } from 'obsidian-utils'
import { basename, dirname } from 'path'
import { Config } from '../services/config/index.types'
import { isTestEnv } from '../utils/env'
import { logger } from '../utils/logger'

export const findVaultsByPatternMatching = async (pathPattern: string) => {
  if (!pathPattern.endsWith('.obsidian')) {
    pathPattern = `${pathPattern}/**/.obsidian`
  }

  const vaultsMatches = await glob(pathPattern, {
    absolute: true,
    dot: true,
    nocase: true,
  })
  const detectedVaults: Vault[] = []
  const vaultsQueryPromises = vaultsMatches.map((vault) => findVault(vault))

  for await (const [vault] of vaultsQueryPromises) {
    detectedVaults.push({
      ...vault,
      name: basename(dirname(vault.path)),
      path: dirname(vault.path),
    })
  }

  return detectedVaults
}

export const vaultsSelector = async (vaults: Vault[]) => {
  const choices = vaults
    .map((vault) => ({
      name: vault.name,
      value: vault,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))

  if (isTestEnv()) {
    const [{ value: testVault }] = choices
    return [testVault]
  }

  const selectedVaults = await checkbox({
    choices,
    message: 'Select the vaults:',
    validate: (selected) =>
      selected.length > 0 || 'At least one vault must be selected',
    required: true,
  })

  logger.debug('Selected vaults', { selectedVaults })

  return selectedVaults
}

export const getVaultPath = (vault: Vault) => vault.path
export const getVaultName = (vault: Vault) => vault.name

/**
 * Loads vaults based on the specified path or from the configuration.
 * If a path is specified, it will find vaults by pattern matching.
 * If no path is specified, it will find vaults from the Obsidian configuration.
 * Throws an error if no vaults are found.
 *
 * @param path - The path to search for vaults.
 * @returns A promise that resolves to an array of Vault objects.
 * @throws An error if no vaults are found.
 */
export const loadVaults = async (path: string): Promise<Vault[]> => {
  const isPathSpecifiedAndValid = path && path.trim().length > 0
  let vaults: Vault[] = []

  if (isPathSpecifiedAndValid) {
    vaults = await findVaultsByPatternMatching(path)
  } else {
    vaults = await findVault()
  }

  if (vaults.length === 0) {
    throw new Error(`No vaults found!`)
  }

  return vaults
}

export const mapVaultsIteratorItem = <A, F>(
  vaults: Vault[],
  config: Config,
  flags: F,
  args: A = {} as A,
) =>
  vaults.map((vault) => ({
    vault,
    config,
    flags,
    args,
  }))

export const getSelectedVaults = async (path: string) => {
  const vaults = await loadVaults(path)
  return await vaultsSelector(vaults)
}
