import { checkbox } from '@inquirer/prompts'
import { glob } from 'glob'
import { findVault, Vault } from 'obsidian-utils'
import path from 'path'
import { logger } from '../utils/logger'

export const findVaultsByPatternMatching = async (pathPattern: string) => {
  if (!pathPattern.endsWith('.obsidian')) {
    pathPattern = `${pathPattern}/**/.obsidian`
  }

  const vaultsMatches = await glob(pathPattern, { absolute: true, dot: true, nocase: true })
  const detectedVaults = []
  const vaultsQueryPromises = vaultsMatches.map((vault) => findVault(vault))

  for await (const [vault] of vaultsQueryPromises) {
    detectedVaults.push({
      ...vault,
      name: path.basename(path.dirname(vault.path)),
      path: path.dirname(vault.path),
    })
  }

  return detectedVaults
}

export const findVaultsFromConfig = findVault

export const vaultsSelector = async (vaults: Vault[]) => {
  const choices = vaults
    .map((vault) => ({
      name: vault.name,
      value: vault,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))

  const selectedVaults = await checkbox({
    choices,
    message: 'Select the vaults:',
    validate: (selected) => selected.length > 0 || 'At least one vault must be selected',
    required: true,
  })

  logger.debug('selectedVaults', { selectedVaults })

  return selectedVaults
}
