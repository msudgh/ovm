import path from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as configSyncProvider from '../../providers/configSync'
import {
  destroyVault,
  getTestCommonWithVaultPathFlags,
  setupVault,
} from '../../utils/testing'
import { ConfigSchema } from '../config'
import { syncVaultCoreIterator } from './vaultSync'

vi.mock('../../providers/configSync', async () => {
  const actual = await vi.importActual('../../providers/configSync')
  return {
    ...actual,
    syncFileToVault: vi.fn(),
  }
})

describe('Command: vaults sync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Set default successful mock
    vi.mocked(configSyncProvider.syncFileToVault).mockResolvedValue(true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('syncVaultCoreIterator', () => {
    const testVaultSetup = async () => {
      const { vault, config } = await setupVault()
      return { vault, config }
    }

    afterEach(() => {
      vi.clearAllMocks()
    })

    it('should sync core configurations successfully', async () => {
      const { vault, config: testConfig } = await testVaultSetup()
      const flags = getTestCommonWithVaultPathFlags(testConfig.path, vault.path)

      const config = ConfigSchema.parse({
        plugins: [],
        configSync: {
          files: [
            {
              source: 'configs/app.json',
              target: 'app.json',
              type: 'core',
            },
            {
              source: 'configs/workspace.json',
              target: 'workspace.json',
              type: 'core',
            },
          ],
        },
      })

      const result = await syncVaultCoreIterator({
        vault,
        config,
        flags: {
          ...flags,
          overwrite: true,
          backup: true,
          mergeStrategy: 'replace',
        },
      })

      expect(result.synced).toBe(2)
      expect(result.skipped).toBe(0)
      expect(configSyncProvider.syncFileToVault).toHaveBeenCalledTimes(2)

      destroyVault(vault.path)
    })

    it('should sync custom configurations successfully', async () => {
      const { vault, config: testConfig } = await testVaultSetup()
      const flags = getTestCommonWithVaultPathFlags(testConfig.path, vault.path)

      const config = ConfigSchema.parse({
        plugins: [],
        configSync: {
          files: [
            {
              source: 'configs/custom-config.json',
              target: 'themes/custom-theme.css',
              type: 'custom',
            },
          ],
        },
      })

      const result = await syncVaultCoreIterator({
        vault,
        config,
        flags: {
          ...flags,
          overwrite: true,
          backup: true,
          mergeStrategy: 'replace',
        },
      })

      expect(result.synced).toBe(1)
      expect(result.skipped).toBe(0)
      expect(configSyncProvider.syncFileToVault).toHaveBeenCalledTimes(1)

      destroyVault(vault.path)
    })

    it('should ignore plugin type entries', async () => {
      const { vault, config: testConfig } = await testVaultSetup()
      const flags = getTestCommonWithVaultPathFlags(testConfig.path, vault.path)

      const config = ConfigSchema.parse({
        plugins: [],
        configSync: {
          files: [
            {
              source: 'configs/app.json',
              target: 'app.json',
              type: 'core',
            },
            {
              source: 'configs/plugin-data.json',
              target: 'data.json',
              type: 'plugin',
              pluginId: 'some-plugin',
            },
          ],
        },
      })

      const result = await syncVaultCoreIterator({
        vault,
        config,
        flags: {
          ...flags,
          overwrite: true,
          backup: true,
          mergeStrategy: 'replace',
        },
      })

      expect(result.synced).toBe(1)
      expect(result.skipped).toBe(0)
      expect(configSyncProvider.syncFileToVault).toHaveBeenCalledTimes(1)

      destroyVault(vault.path)
    })

    it('should filter by vault name', async () => {
      const { vault, config: testConfig } = await testVaultSetup()
      const flags = getTestCommonWithVaultPathFlags(testConfig.path, vault.path)

      const config = ConfigSchema.parse({
        plugins: [],
        configSync: {
          files: [
            {
              source: 'configs/app.json',
              target: 'app.json',
              type: 'core',
              vaults: [vault.name], // Should be included
            },
            {
              source: 'configs/workspace.json',
              target: 'workspace.json',
              type: 'core',
              vaults: ['other-vault'], // Should be excluded
            },
          ],
        },
      })

      const result = await syncVaultCoreIterator({
        vault,
        config,
        flags: {
          ...flags,
          overwrite: true,
          backup: true,
          mergeStrategy: 'replace',
        },
      })

      expect(result.synced).toBe(1)
      expect(result.skipped).toBe(0)
      expect(configSyncProvider.syncFileToVault).toHaveBeenCalledTimes(1)

      destroyVault(vault.path)
    })

    it('should sync CSS snippets to specific vaults using custom type', async () => {
      const { vault, config: testConfig } = await testVaultSetup()
      const flags = getTestCommonWithVaultPathFlags(testConfig.path, vault.path)

      const config = ConfigSchema.parse({
        plugins: [],
        configSync: {
          files: [
            {
              source: 'snippets/custom-theme.css',
              target: 'snippets/custom-theme.css',
              type: 'custom',
              vaults: [vault.name], // Target specific vault
            },
            {
              source: 'snippets/editor-enhancements.css',
              target: 'snippets/editor-enhancements.css',
              type: 'custom',
              vaults: ['WorkVault', 'PersonalVault'], // Target different vaults
            },
          ],
        },
      })

      const result = await syncVaultCoreIterator({
        vault,
        config,
        flags: {
          ...flags,
          overwrite: true,
          backup: true,
          mergeStrategy: 'replace',
        },
      })

      expect(result.synced).toBe(1) // Only first snippet should sync to this vault
      expect(result.skipped).toBe(0)
      expect(configSyncProvider.syncFileToVault).toHaveBeenCalledTimes(1)
      expect(configSyncProvider.syncFileToVault).toHaveBeenCalledWith({
        source: expect.stringContaining(
          path.join('snippets', 'custom-theme.css'),
        ),
        target: 'snippets/custom-theme.css',
        type: 'custom',
        vaultPath: vault.path,
        mergeStrategy: 'replace',
        include: undefined,
        exclude: undefined,
        overwrite: true,
        backup: true,
        onlyIfInstalled: false,
      })

      destroyVault(vault.path)
    })

    it('should sync hotkeys configuration to selected vaults using core type', async () => {
      const { vault, config: testConfig } = await testVaultSetup()
      const flags = getTestCommonWithVaultPathFlags(testConfig.path, vault.path)

      const config = ConfigSchema.parse({
        plugins: [],
        configSync: {
          files: [
            {
              source: 'configs/main-hotkeys.json',
              target: 'hotkeys.json',
              type: 'core',
              vaults: [vault.name, 'Vault2', 'Vault3'], // Target multiple specific vaults
              mergeStrategy: 'smart',
            },
            {
              source: 'configs/advanced-hotkeys.json',
              target: 'hotkeys.json',
              type: 'core',
              vaults: ['PowerUserVault'], // Different hotkeys for power users
              mergeStrategy: 'replace',
            },
          ],
        },
      })

      const result = await syncVaultCoreIterator({
        vault,
        config,
        flags: {
          ...flags,
          overwrite: true,
          backup: true,
          mergeStrategy: 'replace', // Should be overridden by config
        },
      })

      expect(result.synced).toBe(1) // Only first hotkeys should sync to this vault
      expect(result.skipped).toBe(0)
      expect(configSyncProvider.syncFileToVault).toHaveBeenCalledTimes(1)
      expect(configSyncProvider.syncFileToVault).toHaveBeenCalledWith({
        source: expect.stringContaining(
          path.join('configs', 'main-hotkeys.json'),
        ),
        target: 'hotkeys.json',
        type: 'core',
        vaultPath: vault.path,
        mergeStrategy: 'smart', // Should use config's merge strategy
        include: undefined,
        exclude: undefined,
        overwrite: true,
        backup: true,
        onlyIfInstalled: false,
      })

      destroyVault(vault.path)
    })

    it('should sync multiple different configurations to overlapping vault sets', async () => {
      const { vault, config: testConfig } = await testVaultSetup()
      const flags = getTestCommonWithVaultPathFlags(testConfig.path, vault.path)

      // Simulate scenario:
      // - 15 vaults total
      // - 8 vaults get Note Toolbar config
      // - 4 vaults get Commander config
      // - Some overlap in vault targeting
      const config = ConfigSchema.parse({
        plugins: [],
        configSync: {
          files: [
            // CSS snippets for specific theme
            {
              source: 'snippets/dark-mode-enhancements.css',
              target: 'snippets/dark-mode-enhancements.css',
              type: 'custom',
              vaults: [vault.name, 'WorkVault', 'StudyVault'],
            },
            // Hotkeys for productivity vaults
            {
              source: 'configs/productivity-hotkeys.json',
              target: 'hotkeys.json',
              type: 'core',
              vaults: [vault.name, 'WorkVault'], // Overlapping with snippets
              mergeStrategy: 'smart',
              include: ['editor:toggle-bold', 'workspace:split-vertical'],
            },
            // App settings for work vaults
            {
              source: 'configs/work-app-settings.json',
              target: 'app.json',
              type: 'core',
              vaults: ['WorkVault', 'ClientVault'],
              mergeStrategy: 'merge',
            },
          ],
        },
      })

      const result = await syncVaultCoreIterator({
        vault,
        config,
        flags: {
          ...flags,
          overwrite: true,
          backup: true,
          mergeStrategy: 'replace',
        },
      })

      expect(result.synced).toBe(2) // Snippets + hotkeys should sync to this vault
      expect(result.skipped).toBe(0)
      expect(configSyncProvider.syncFileToVault).toHaveBeenCalledTimes(2)

      // Verify snippets sync call
      expect(configSyncProvider.syncFileToVault).toHaveBeenCalledWith({
        source: expect.stringContaining(
          path.join('snippets', 'dark-mode-enhancements.css'),
        ),
        target: 'snippets/dark-mode-enhancements.css',
        type: 'custom',
        vaultPath: vault.path,
        mergeStrategy: 'replace', // Uses flag default
        include: undefined,
        exclude: undefined,
        overwrite: true,
        backup: true,
        onlyIfInstalled: false,
      })

      // Verify hotkeys sync call
      expect(configSyncProvider.syncFileToVault).toHaveBeenCalledWith({
        source: expect.stringContaining(
          path.join('configs', 'productivity-hotkeys.json'),
        ),
        target: 'hotkeys.json',
        type: 'core',
        vaultPath: vault.path,
        mergeStrategy: 'smart', // Uses config override
        include: ['editor:toggle-bold', 'workspace:split-vertical'],
        exclude: undefined,
        overwrite: true,
        backup: true,
        onlyIfInstalled: false,
      })

      destroyVault(vault.path)
    })

    it('should correctly pass parameters to the sync provider', async () => {
      const { vault, config: testConfig } = await testVaultSetup()
      const flags = getTestCommonWithVaultPathFlags(testConfig.path, vault.path)

      const config = ConfigSchema.parse({
        plugins: [],
        configSync: {
          files: [
            {
              source: 'configs/main-hotkeys.json',
              target: 'hotkeys.json',
              type: 'core',
              vaults: [vault.name],
              mergeStrategy: 'smart',
              include: ['keys'],
              exclude: ['commands'],
            },
          ],
        },
      })

      await syncVaultCoreIterator({
        vault,
        config,
        flags: {
          ...flags,
          overwrite: true,
          backup: true,
          mergeStrategy: 'replace', // Should be overridden by file-specific config
        },
      })

      expect(configSyncProvider.syncFileToVault).toHaveBeenCalledWith({
        source: expect.stringContaining(
          path.join('configs', 'main-hotkeys.json'),
        ),
        target: 'hotkeys.json',
        type: 'core',
        vaultPath: vault.path,
        mergeStrategy: 'smart', // Expect file-specific strategy
        include: ['keys'],
        exclude: ['commands'],
        overwrite: true,
        backup: true,
        onlyIfInstalled: false,
      })

      destroyVault(vault.path)
    })

    it('should skip syncing if vault is not in the list', async () => {
      const { vault, config: testConfig } = await testVaultSetup()
      const flags = getTestCommonWithVaultPathFlags(testConfig.path, vault.path)

      const config = ConfigSchema.parse({
        plugins: [],
        configSync: {
          files: [
            {
              source: 'configs/app.json',
              target: 'app.json',
              type: 'core',
              vaults: ['AnotherVault'],
            },
          ],
        },
      })

      const result = await syncVaultCoreIterator({
        vault,
        config,
        flags: {
          ...flags,
          overwrite: false,
          backup: false,
          mergeStrategy: 'smart',
        },
      })

      expect(result.synced).toBe(0)
      expect(result.skipped).toBe(0) // Filtered, not skipped
      expect(configSyncProvider.syncFileToVault).not.toHaveBeenCalled()

      destroyVault(vault.path)
    })
  })
})
