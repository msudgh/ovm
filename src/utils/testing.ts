import { Dirent, existsSync } from 'fs'
import fse from 'fs-extra'
import fsp from 'fs/promises'
import { platform, tmpdir } from 'os'
import path from 'path'
import { ConfigSchema, createDefaultConfig } from '../services/config/index'
import { Config } from '../services/config/index.types'
import { OVM_CONFIG_FILENAME } from './constants'
import { CUSTOM_COMMAND_LOGGER_FILE } from './logger'

export const getTestConfigFilePath = (vaultPath: string) => {
  if (platform() === 'win32') {
    return path.win32.join(vaultPath, OVM_CONFIG_FILENAME)
  }

  return path.join(vaultPath, OVM_CONFIG_FILENAME)
}

export const destroyConfigMockFile = (path: string) => {
  const normalizedPath = path.normalize('NFC')

  if (normalizedPath && existsSync(normalizedPath)) {
    fse.rmSync(normalizedPath, { force: true })
  }
}

export const setupVault = async (overrideConfig?: Config) => {
  const vaultName = `ovm-test-vault-${Date.now()}-${Math.floor(Math.random() * 1000)}`
  const vaultPath = path.join(tmpdir(), vaultName)
  const configFilePath = path.join(vaultPath, OVM_CONFIG_FILENAME)

  const normalizedPath = path.normalize(vaultPath)

  // Ensure the vault directory exists first
  if (!existsSync(normalizedPath)) {
    fse.mkdirpSync(normalizedPath)
  }

  // Ensure the config file directory exists (same as vault path in this case)
  const configDir = path.dirname(configFilePath)
  if (!existsSync(configDir)) {
    fse.mkdirpSync(configDir)
  }

  // Then create the .obsidian directory
  const obsidianDir = path.resolve(normalizedPath, '.obsidian')
  if (!existsSync(obsidianDir)) {
    fse.mkdirpSync(obsidianDir)
  }

  const normalizedVaultCommunityPluginsPath = path.resolve(
    obsidianDir,
    'community-plugins.json',
  )

  if (!existsSync(normalizedVaultCommunityPluginsPath)) {
    fse.writeFileSync(normalizedVaultCommunityPluginsPath, JSON.stringify([]))
  }

  const config = await createDefaultConfig(
    configFilePath,
    overrideConfig ??
      ConfigSchema.parse({ plugins: [], configSync: { files: [] } }),
  )

  return {
    vault: { name: vaultName, path: normalizedPath },
    config: { ...config, ...{ path: configFilePath } },
  }
}

export const getTestCommonFlags = (configFilePath: string) => ({
  debug: false,
  timestamp: false,
  config: configFilePath,
})
export const getTestCommonWithVaultPathFlags = (
  configFilePath: string,
  vaultPath: string,
) => ({
  debug: false,
  timestamp: false,
  config: configFilePath,
  path: vaultPath,
  output: 'json',
})

export const destroyVault = (vaultPath: string) => {
  const normalizedPath = path.normalize(vaultPath)

  if (normalizedPath && existsSync(normalizedPath)) {
    fse.emptyDirSync(normalizedPath)
    fsp.rmdir(normalizedPath)
  }

  const customLogsPath = path.normalize(CUSTOM_COMMAND_LOGGER_FILE)

  if (customLogsPath && existsSync(customLogsPath)) {
    fse.rmSync(customLogsPath, { force: true })
  }
}

export const createMockDirent = (
  name: string,
  isDirectory: boolean,
): Dirent => ({
  name,
  isDirectory: () => isDirectory,
  isFile: () => !isDirectory,
  isBlockDevice: () => false,
  isCharacterDevice: () => false,
  isSymbolicLink: () => false,
  isFIFO: () => false,
  isSocket: () => false,
  parentPath: '',
  path: '',
})
