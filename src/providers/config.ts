import { readFileSync, writeFileSync } from 'fs'
import { GitHubPluginVersion } from 'obsidian-utils'
import z from 'zod'
import { DEFAULT_CONFIG_PATH } from '../constants'
import { logger } from '../utils/logger'

export type Plugin = { id: string; version: GitHubPluginVersion }

export type Config = {
  plugins: Plugin[]
}

export const ConfigSchema = z.object({
  plugins: z.array(z.custom<Plugin>()).default([]),
})

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

export const safeLoadConfig = (configPath = DEFAULT_CONFIG_PATH): Promise<SafeLoadConfigResult> => {
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
      if (typedError instanceof Error && typedError.message.includes('ENOENT')) {
        resolve({ success: false, data: undefined, error: new Error('Config file not found') })
      }

      resolve({ success: false, data: undefined, error: typedError })
    }
  })
}

const writeConfig = (config: Config, configPath = DEFAULT_CONFIG_PATH): Promise<void | Error> => {
  return new Promise((resolve, reject) => {
    try {
      const content = JSON.stringify(config, null, 2)
      writeFileSync(configPath, content)
      resolve()
    } catch (error) {
      reject(error as Error)
    }
  })
}

export const createDefaultConfig = (configPath = DEFAULT_CONFIG_PATH): Promise<Config | Error> => {
  return new Promise((resolve, reject) => {
    try {
      const defaultConfig = ConfigSchema.parse({})
      writeConfig(defaultConfig)

      logger.debug('Default config created', { configPath })

      resolve(defaultConfig)
    } catch (error) {
      const typedError = error as Error
      reject(typedError)
    }
  })
}
