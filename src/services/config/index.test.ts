import fs from 'fs'
import { tmpdir } from 'os'
import path from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ConfigSchema,
  createDefaultConfig,
  loadConfig,
  PluginSchema,
  safeLoadConfig,
  syncEntrySchema,
  writeConfig,
} from '.'
import { OVM_CONFIG_FILENAME } from '../../utils/constants'
import { destroyVault, setupVault } from '../../utils/testing'
import type { Config } from './index.types'

// Mock process.exit to avoid actually exiting during tests
const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
  throw new Error('process.exit called')
})

describe('Config', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    mockExit.mockClear()
  })

  describe('safeLoadConfig', () => {
    it('should load config from path', async () => {
      const sampleDefaultConfig = ConfigSchema.parse({ plugins: [] })
      const { vault, config } = await setupVault(sampleDefaultConfig)
      const loadedConfig = await safeLoadConfig(config.path)

      expect(loadedConfig.success).toBe(true)
      expect(loadedConfig.error).toBeUndefined()
      expect(loadedConfig.data).toEqual(sampleDefaultConfig)

      destroyVault(vault.path)
    })

    it("should return error if the config file doesn't exist", async () => {
      const result = await safeLoadConfig('non-existent-file')

      expect(result.success).toBe(false)
      expect(result.data).toBeUndefined()
      expect(result.error?.message).toBe('Config file not found')
    })

    it('should return error if the config file is not valid JSON', async () => {
      const vaultName = `ovm-test-vault-${Date.now()}`
      const vaultPath = path.join(tmpdir(), vaultName)
      const configFilePath = path.join(vaultPath, OVM_CONFIG_FILENAME)

      fs.mkdirSync(vaultPath)
      fs.writeFileSync(configFilePath, 'invalid content')

      const result = await safeLoadConfig(configFilePath)

      expect(result.success).toBe(false)
      expect(result.data).toBeUndefined()
      expect(result.error?.message).toBe('Invalid JSON format')

      destroyVault(vaultPath)
    })

    it('should return error if the config file has invalid schema', async () => {
      const { vault, config } = await setupVault({
        // @ts-expect-error To create an invalid config
        invalidKey: 'invalidValue',
      })

      const result = await safeLoadConfig(config.path)

      expect(result.success).toBe(false)
      expect(result.data).toBeUndefined()
      expect(result.error?.message).toBe('Invalid config file')

      destroyVault(vault.path)
    })

    it('should handle generic file read errors', async () => {
      const vaultName = `ovm-test-vault-${Date.now()}`
      const vaultPath = path.join(tmpdir(), vaultName)
      const configFilePath = path.join(vaultPath, OVM_CONFIG_FILENAME)

      // Create a directory where the config file should be (to trigger EISDIR error)
      fs.mkdirSync(vaultPath, { recursive: true })
      fs.mkdirSync(configFilePath)

      const result = await safeLoadConfig(configFilePath)

      expect(result.success).toBe(false)
      expect(result.data).toBeUndefined()
      expect(result.error).toBeInstanceOf(Error)

      destroyVault(vaultPath)
    })
  })

  describe('loadConfig', () => {
    it('should load config successfully and return data', async () => {
      const sampleConfig = ConfigSchema.parse({
        plugins: [{ id: 'test-plugin' }],
        sync: {
          files: [
            {
              source: 'test.json',
              target: 'test.json',
              type: 'plugin',
            },
          ],
        },
      })
      const { vault, config } = await setupVault(sampleConfig)

      const loadedConfig = await loadConfig(config.path)

      expect(loadedConfig).toEqual(sampleConfig)

      destroyVault(vault.path)
    })

    it('should exit process when config loading fails', async () => {
      try {
        await loadConfig('non-existent-file')
      } catch (error) {
        expect((error as Error).message).toBe('process.exit called')
      }

      expect(mockExit).toHaveBeenCalledWith(1)
    })

    it('should exit process and parse JSON cause when config has invalid schema', async () => {
      const { vault, config } = await setupVault({
        // @ts-expect-error To create an invalid config
        invalidKey: 'invalidValue',
      })

      try {
        await loadConfig(config.path)
      } catch (error) {
        expect((error as Error).message).toBe('process.exit called')
      }

      expect(mockExit).toHaveBeenCalledWith(1)

      destroyVault(vault.path)
    })
  })

  describe('writeConfig', () => {
    it('should write config to file', async () => {
      const vaultName = `ovm-test-vault-${Date.now()}`
      const vaultPath = path.join(tmpdir(), vaultName)
      const configFilePath = path.join(vaultPath, OVM_CONFIG_FILENAME)

      const testConfig: Config = {
        plugins: [{ id: 'test-plugin', version: 'latest' }],
        sync: {
          files: [
            {
              source: 'source.json',
              target: 'target.json',
              type: 'core',
            },
          ],
        },
      }

      await writeConfig(testConfig, configFilePath)

      expect(fs.existsSync(configFilePath)).toBe(true)
      const writtenContent = fs.readFileSync(configFilePath, 'utf-8')
      const parsedContent = JSON.parse(writtenContent)

      expect(parsedContent).toEqual(testConfig)

      destroyVault(vaultPath)
    })

    it('should create directory if it does not exist', async () => {
      const vaultName = `ovm-test-vault-${Date.now()}`
      const vaultPath = path.join(tmpdir(), vaultName)
      const nestedPath = path.join(vaultPath, 'nested', 'path')
      const configFilePath = path.join(nestedPath, OVM_CONFIG_FILENAME)

      const testConfig: Config = { plugins: [] }

      await writeConfig(testConfig, configFilePath)

      expect(fs.existsSync(nestedPath)).toBe(true)
      expect(fs.existsSync(configFilePath)).toBe(true)

      destroyVault(vaultPath)
    })
  })

  describe('createDefaultConfig', () => {
    it('should create default config without options', async () => {
      const vaultName = `ovm-test-vault-${Date.now()}`
      const vaultPath = path.join(tmpdir(), vaultName)
      const configFilePath = path.join(vaultPath, OVM_CONFIG_FILENAME)

      const createdConfig = await createDefaultConfig(configFilePath)

      expect(createdConfig).toEqual({ plugins: [] })
      expect(fs.existsSync(configFilePath)).toBe(true)

      destroyVault(vaultPath)
    })

    it('should create config with provided options', async () => {
      const vaultName = `ovm-test-vault-${Date.now()}`
      const vaultPath = path.join(tmpdir(), vaultName)
      const configFilePath = path.join(vaultPath, OVM_CONFIG_FILENAME)

      const customConfig: Config = {
        plugins: [{ id: 'custom-plugin', repo: 'user/repo' }],
        sync: {
          files: [
            {
              source: 'custom.json',
              target: 'custom.json',
              type: 'custom',
              mergeStrategy: 'merge',
            },
          ],
        },
      }

      const createdConfig = await createDefaultConfig(
        configFilePath,
        customConfig,
      )

      expect(createdConfig).toEqual(customConfig)
      expect(fs.existsSync(configFilePath)).toBe(true)

      destroyVault(vaultPath)
    })
  })

  describe('Schema validation', () => {
    it('should validate PluginSchema correctly', () => {
      const validPlugin = { id: 'test-plugin' }
      const result = PluginSchema.safeParse(validPlugin)
      expect(result.success).toBe(true)

      const validPluginWithAllFields = {
        id: 'test-plugin',
        version: 'latest' as const,
        repo: 'user/repo',
        name: 'Test Plugin',
        author: 'Test Author',
        description: 'Test Description',
      }
      const resultWithAllFields = PluginSchema.safeParse(
        validPluginWithAllFields,
      )
      expect(resultWithAllFields.success).toBe(true)
    })

    it('should validate syncEntrySchema correctly', () => {
      const validEntry = {
        source: 'source.json',
        target: 'target.json',
        type: 'plugin' as const,
      }
      const result = syncEntrySchema.safeParse(validEntry)
      expect(result.success).toBe(true)

      const entryWithAllFields = {
        source: 'source.json',
        target: 'target.json',
        type: 'custom' as const,
        pluginId: 'test-plugin',
        mergeStrategy: 'smart' as const,
        vaults: ['vault1', 'vault2'],
        onlyIfInstalled: true,
        include: ['key1', 'key2'],
        exclude: ['key3', 'key4'],
      }
      const resultWithAllFields = syncEntrySchema.safeParse(entryWithAllFields)
      expect(resultWithAllFields.success).toBe(true)
    })

    it('should validate ConfigSchema correctly', () => {
      const minimalConfig = {}
      const result = ConfigSchema.safeParse(minimalConfig)
      expect(result.success).toBe(true)
      expect(result.data?.plugins).toEqual([])

      const fullConfig = {
        plugins: [{ id: 'test-plugin' }],
        sync: {
          files: [
            {
              source: 'test.json',
              target: 'test.json',
              type: 'core' as const,
            },
          ],
        },
      }
      const fullResult = ConfigSchema.safeParse(fullConfig)
      expect(fullResult.success).toBe(true)
    })

    it('should validate config with baseDir', () => {
      const configWithBaseDir = {
        sync: {
          baseDir: 'test-dir',
        },
      }
      const result = ConfigSchema.safeParse(configWithBaseDir)
      expect(result.success).toBe(true)
      expect(result.data?.sync?.baseDir).toBe('test-dir')
    })
  })
})
