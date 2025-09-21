import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'fs'
import { dirname, join } from 'path'
import { SyncMergeStrategy } from '../services/config/index.types'
import { SyncConfigOptions } from '../types/sync'
import { logger } from '../utils/logger'

// Helper for deep merging with include/exclude support
// A good candidate to be extracted into a utility function or 3rd party library
const deepMerge = (
  target: Record<string, unknown>,
  source: Record<string, unknown>,
  options?: { include?: string[]; exclude?: string[] },
): Record<string, unknown> => {
  const result = { ...target }
  for (const [key, value] of Object.entries(source)) {
    // Skip excluded keys
    if (options?.exclude?.includes(key)) continue
    // Only include specific keys if include is set
    if (options?.include && !options.include.includes(key)) continue
    // Recursively merge objects
    if (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      typeof result[key] === 'object' &&
      result[key] !== null &&
      !Array.isArray(result[key])
    ) {
      result[key] = deepMerge(
        result[key] as Record<string, unknown>,
        value as Record<string, unknown>,
      )
    } else {
      result[key] = value
    }
  }
  return result
}

export const syncFileToVault = async (
  options: SyncConfigOptions,
): Promise<boolean> => {
  const {
    source,
    target,
    type,
    vaultPath,
    pluginId,
    mergeStrategy = 'replace',
    include,
    exclude,
    overwrite = true,
    backup = true,
    onlyIfInstalled = true,
  } = options

  // Determine target path based on config type
  let targetPath: string
  if (type === 'plugin' && pluginId) {
    // Plugin configs go in plugins/<pluginId>/
    const pluginPath = join(vaultPath, '.obsidian', 'plugins', pluginId)
    if (onlyIfInstalled && !existsSync(pluginPath)) {
      logger.info(
        `Skipping ${pluginId} config, plugin not installed in ${vaultPath}`,
      )
      return false
    }
    targetPath = join(pluginPath, target)
  } else if (type === 'core') {
    // Core configs go directly in .obsidian/
    targetPath = join(vaultPath, '.obsidian', target)
  } else {
    // Custom path (could be anywhere within .obsidian/)
    targetPath = join(vaultPath, '.obsidian', target)
  }

  // Create directory if it doesn't exist
  mkdirSync(dirname(targetPath), { recursive: true })

  // Check if target exists
  const targetExists = existsSync(targetPath)
  if (targetExists && !overwrite) {
    logger.info(`Skipping ${target}, file exists and overwrite=false`)
    return false
  }

  // Create backup if needed
  if (targetExists && backup) {
    const backupPath = `${targetPath}.bak`
    copyFileSync(targetPath, backupPath)
    logger.debug(`Created backup at ${backupPath}`)
  }

  // Handle different merge strategies
  if (mergeStrategy === 'replace' || !targetExists) {
    // Simple file copy
    copyFileSync(source, targetPath)
    logger.info(`Copied ${source} to ${targetPath}`)
  } else {
    // Merge JSON configs
    try {
      const sourceData = JSON.parse(readFileSync(source, 'utf8')) as Record<
        string,
        unknown
      >
      const targetData = JSON.parse(readFileSync(targetPath, 'utf8')) as Record<
        string,
        unknown
      >
      let result: Record<string, unknown>
      if (mergeStrategy === 'merge') {
        // Simple shallow merge
        result = { ...(targetData || {}), ...(sourceData || {}) }
      } else if (mergeStrategy === 'smart') {
        // Deep merge with include/exclude support
        result = deepMerge(targetData || {}, sourceData || {}, {
          include,
          exclude,
        })
      } else {
        result = sourceData || {}
      }
      writeFileSync(targetPath, JSON.stringify(result, null, 2))
      logger.info(
        `Merged ${source} into ${targetPath} using strategy: ${mergeStrategy}`,
      )
    } catch (error) {
      logger.error(`Failed to merge ${source} to ${targetPath}: ${error}`)
      return false
    }
  }
  return true
}

// Specialized function for syncing plugin configs
export const syncPluginConfigToVault = async (options: {
  source: string
  target: string
  pluginId: string
  vaultPath: string
  mergeStrategy: SyncMergeStrategy
  include?: string[]
  exclude?: string[]
  overwrite?: boolean
  backup?: boolean
  onlyIfInstalled?: boolean
}): Promise<boolean> => {
  const {
    source,
    target,
    pluginId,
    vaultPath,
    mergeStrategy = 'replace',
    include,
    exclude,
    overwrite = true,
    backup = true,
    onlyIfInstalled = true,
  } = options

  // Plugin configs go in plugins/<pluginId>/
  const pluginPath = join(vaultPath, '.obsidian', 'plugins', pluginId)
  if (onlyIfInstalled && !existsSync(pluginPath)) {
    logger.info(
      `Skipping ${pluginId} config, plugin not installed in ${vaultPath}`,
    )
    return false
  }

  return syncFileToVault({
    source,
    target,
    type: 'plugin',
    vaultPath,
    pluginId,
    mergeStrategy,
    include,
    exclude,
    overwrite,
    backup,
    onlyIfInstalled,
  })
}
