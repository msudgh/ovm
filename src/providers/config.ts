import { readFileSync, writeFileSync } from 'fs'
import { GitHubPluginVersion } from 'obsidian-utils'
import z from 'zod'
import { logger } from '../utils/logger'

const PluginSchema = z.object({
  id: z.string(),
  version: z.custom<GitHubPluginVersion>().optional(),
})

export type Plugin = z.infer<typeof PluginSchema>

export const ConfigSchema = z.object({
  plugins: z.array(PluginSchema).default([]),
})

export type Config = z.infer<typeof ConfigSchema>

type SafeLoadConfigResultSuccess = {
  success: true
  data: Config
  error: undefined
}

type SafeLoadConfigResultError = {
  success: false
  data: undefined
  error: Error
}

type SafeLoadConfigResult =
  | ({
      success: boolean
    } & SafeLoadConfigResultSuccess)
  | SafeLoadConfigResultError

export const safeLoadConfig = (
  configPath: string,
): Promise<SafeLoadConfigResult> => {
  return new Promise((resolve) => {
    try {
      const config = readFileSync(configPath)
      const parsed = JSON.parse(config.toString()) as Config
      const { success, data, error } = ConfigSchema.safeParse(parsed)

      if (!success) {
        logger.debug('Invalid config file', { data, error })
        throw new Error('Invalid config file')
      }

      resolve({ success, data, error: undefined })
    } catch (error) {
      const typedError = error as Error
      if (
        typedError instanceof Error &&
        typedError.message.includes('ENOENT')
      ) {
        resolve({
          success: false,
          data: undefined,
          error: new Error('Config file not found'),
        })
      }

      resolve({ success: false, data: undefined, error: typedError })
    }
  })
}

export const writeConfig = (
  config: Config,
  path: string,
): Promise<void | Error> => {
  logger.debug('Writing config', { path })
  return new Promise((resolve, reject) => {
    try {
      const content = JSON.stringify(config, null, 2)

      writeFileSync(path, content)
      logger.debug('Config written', { path })
      resolve()
    } catch (error) {
      reject(error as Error)
    }
  })
}

export const createDefaultConfig = (
  path: string,
): Promise<Config | Error> => {
  return new Promise((resolve, reject) => {
    try {
      const defaultConfig = ConfigSchema.parse({})

      writeConfig(defaultConfig, path)

      logger.info('Config file created', { path })

      resolve(defaultConfig)
    } catch (error) {
      const typedError = error as Error
      reject(typedError)
    }
  })
}
