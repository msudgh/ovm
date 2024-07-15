import { readFileSync, writeFileSync } from 'fs'
import { GitHubPluginVersion } from 'obsidian-utils'
import z from 'zod'
import { DEFAULT_CONFIG_PATH } from '../constants'
import { logger } from '../utils/logger'

export type Plugin = {id: string; version: GitHubPluginVersion}

export type Config = {
  plugins: Plugin[]
}

export const ConfigSchema = z.object({
  plugins: z.array(z.custom<Plugin>()).default([]),
})

export const loadConfig = (configPath = DEFAULT_CONFIG_PATH): Promise<Config> => {
  return new Promise((resolve, reject) => {
    try {
      const config = readFileSync(configPath)
      const parsed = JSON.parse(config.toString()) as Config
      const {success, data, error} = ConfigSchema.safeParse(parsed)

      if (!success) {
        logger.debug('Invalid config file', {data, error})
        throw new Error('Invalid config file')
      }

      resolve(parsed)
    } catch (error) {
      // Handle not found error
      if (error instanceof Error && error.message.includes('ENOENT')) {
        logger.debug('Config file not found')
        const defaultConfig = ConfigSchema.parse({})
        writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2))
        resolve(defaultConfig)
      }

      reject(error as Error)
    }
  })
}
