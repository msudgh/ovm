import { mkdir, readFile, writeFile } from 'fs/promises'
import { GitHubPluginVersion } from 'obsidian-utils'
import { dirname } from 'path'
import z from 'zod'
import { logger } from '../../utils/logger'
import { untildify } from '../../utils/shell'
import { stringToJSONSchema } from '../../utils/transformer'
import {
  Config,
  ConfigSyncMergeStrategy,
  ConfigSyncType,
  SafeLoadConfigResult,
} from './index.types'

export const PluginSchema = z.object({
  id: z.string(),
  version: z.custom<GitHubPluginVersion>().optional(),
  repo: z.string().optional(),
  name: z.string().optional(),
  author: z.string().optional(),
  description: z.string().optional(),
})
export const configSyncType = ['plugin', 'core', 'custom', 'all'] as const
export const configSyncMergeStrategy = ['replace', 'merge', 'smart'] as const
export const ConfigSyncEntrySchema = z.object({
  source: z
    .string()
    .describe(
      'Source file path (relative to ovm config directory or absolute)',
    ),
  target: z
    .string()
    .describe("Target file path (relative to vault's .obsidian directory)"),
  type: z
    .custom<ConfigSyncType>()
    .describe('Type of configuration for special handling'),
  pluginId: z.string().optional().describe('For plugin configs, the plugin ID'),
  mergeStrategy: z
    .custom<ConfigSyncMergeStrategy>()
    .default('replace')
    .describe('Merge strategy for this config'),
  vaults: z
    .array(z.string())
    .optional()
    .describe('Only apply to specific vaults (if empty, apply to all)'),
  onlyIfInstalled: z
    .boolean()
    .default(true)
    .describe('For plugin configs, only sync if plugin is installed'),
  include: z
    .array(z.string())
    .optional()
    .describe('Specific keys to include when merging'),
  exclude: z
    .array(z.string())
    .optional()
    .describe('Specific keys to exclude when merging'),
  backup: z
    .boolean()
    .optional()
    .describe(
      'Create .bak backup if destination exists (default: inherits from command flags)',
    ),
  overwrite: z
    .boolean()
    .optional()
    .describe(
      'Overwrite existing files without prompting (default: inherits from command flags)',
    ),
})

export const ConfigSchema = z
  .object({
    $schema: z.string().optional().describe('JSON Schema for the config'),
    plugins: z.array(PluginSchema).default([]),
    configSync: z
      .object({
        baseDir: z
          .string()
          .optional()
          .describe(
            'Base directory for config files (relative to ovm config directory or absolute)',
          ),
        files: z.array(ConfigSyncEntrySchema).default([]),
      })
      .optional(),
  })
  .strict()
  .describe('OVM Config')

export const safeLoadConfig = async (
  configPath: string,
): Promise<SafeLoadConfigResult> => {
  try {
    const config = await readFile(untildify(configPath))
    const { success, data, error } = stringToJSONSchema
      .pipe(ConfigSchema)
      .safeParse(config.toString())

    if (!success) {
      return {
        success,
        data,
        error: new Error('Invalid config file', { cause: error.message }),
      }
    }

    return { success, data, error: undefined }
  } catch (error) {
    const typedError = error as Error
    if (typedError.message.includes('ENOENT')) {
      return {
        success: false,
        data: undefined,
        error: new Error('Config file not found'),
      }
    }

    return { success: false, data: undefined, error: typedError }
  }
}

export const loadConfig = async (configPath: string) => {
  const {
    success: loadConfigSuccess,
    data: config,
    error: loadConfigError,
  } = await safeLoadConfig(configPath)

  if (!loadConfigSuccess) {
    logger.error(loadConfigError.message, {
      cause:
        typeof loadConfigError.cause === 'string'
          ? JSON.parse(loadConfigError.cause)
          : loadConfigError.cause,
    })
    process.exit(1)
  }

  return config
}

export const writeConfig = async (
  config: Config,
  path: string,
): Promise<void> => {
  logger.debug('Writing config', { path })

  const configDir = dirname(path)
  await mkdir(configDir, { recursive: true })

  const content = JSON.stringify(config, null, 2)

  await writeFile(path, content)

  logger.debug('Config written', { path })
}

export const createDefaultConfig = async (
  path: string,
  opts?: Config,
): Promise<Config> => {
  const defaultConfig = opts ?? ConfigSchema.parse({})

  await writeConfig(defaultConfig, path)

  logger.info('Config file created', { path })

  return defaultConfig
}
