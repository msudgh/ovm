import { dirname, isAbsolute, resolve } from 'path'
import { Config } from '../services/config/index.types'
import { untildify } from './shell'

/**
 * Get config base path for resolving relative source paths
 */
export const getSourceBaseDir = (
  config: Config,
  flags: { config?: string },
): string => {
  const configPath = flags.config || './ovm.json'
  const configDir = dirname(resolve(untildify(configPath)))
  const baseDir = config.configSync?.baseDir

  if (!baseDir) {
    return configDir
  }

  return isAbsolute(baseDir) ? baseDir : resolve(configDir, baseDir)
}

export const resolveSourcePath = (source: string, sourceBaseDir: string) => {
  return isAbsolute(source) ? source : resolve(sourceBaseDir, source)
}
