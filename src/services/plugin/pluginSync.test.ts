import { mkdirSync, writeFileSync } from 'fs'
import path, { join } from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as syncProvider from '../../providers/sync'
import {
  destroyVault,
  getTestCommonWithVaultPathFlags,
  setupVault,
} from '../../utils/testing'
import { ConfigSchema } from '../config'
import { syncPluginVaultIterator } from './pluginSync'

vi.mock('../../providers/sync', async () => {
  const actual = await vi.importActual('../../providers/sync')
  return {
    ...actual,
    syncPluginConfigToVault: vi.fn(),
  }
})

describe('Command: plugins sync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Set default successful mock
    vi.mocked(syncProvider.syncPluginConfigToVault).mockResolvedValue(true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('syncPluginVaultIterator', () => {
    const testVaultSetup = async () => {
      const { vault, config } = await setupVault()
      const pluginPath = join(vault.path, '.obsidian', 'plugins', 'test-plugin')
      mkdirSync(pluginPath, { recursive: true })
      writeFileSync(
        join(pluginPath, 'manifest.json'),
        JSON.stringify({
          id: 'test-plugin',
          name: 'Test Plugin',
        }),
      )
      return { vault, config }
    }

    afterEach(() => {
      vi.clearAllMocks()
    })

    it('should sync plugin configurations successfully', async () => {
      const { vault, config: testConfig } = await testVaultSetup()
      const flags = getTestCommonWithVaultPathFlags(testConfig.path, vault.path)

      const config = ConfigSchema.parse({
        plugins: [],
        sync: {
          files: [
            {
              source: 'configs/test-plugin-data.json',
              target: 'data.json',
              type: 'plugin',
              pluginId: 'test-plugin',
            },
          ],
        },
      })

      const result = await syncPluginVaultIterator({
        vault,
        config,
        flags: {
          ...flags,
          overwrite: true,
          backup: true,
          onlyInstalled: true,
          mergeStrategy: 'replace',
        },
      })

      expect(result.synced).toBe(1)
      expect(result.skipped).toBe(0)
      expect(syncProvider.syncPluginConfigToVault).toHaveBeenCalledTimes(1)

      destroyVault(vault.path)
    })

    it('should filter by specific plugin when pluginId is provided', async () => {
      const { vault, config: testConfig } = await testVaultSetup()
      const flags = getTestCommonWithVaultPathFlags(testConfig.path, vault.path)

      const config = ConfigSchema.parse({
        plugins: [],
        sync: {
          files: [
            {
              source: 'configs/plugin1-data.json',
              target: 'data.json',
              type: 'plugin',
              pluginId: 'plugin1',
            },
            {
              source: 'configs/plugin2-data.json',
              target: 'data.json',
              type: 'plugin',
              pluginId: 'plugin2',
            },
          ],
        },
      })

      const result = await syncPluginVaultIterator({
        vault,
        config,
        flags: {
          ...flags,
          overwrite: true,
          backup: true,
          onlyInstalled: true,
          pluginId: 'plugin1',
          mergeStrategy: 'replace',
        },
      })

      expect(result.synced).toBe(1)
      expect(result.skipped).toBe(0)
      expect(syncProvider.syncPluginConfigToVault).toHaveBeenCalledTimes(1)

      destroyVault(vault.path)
    })

    it('should skip entries without pluginId', async () => {
      const { vault, config: testConfig } = await testVaultSetup()
      const flags = getTestCommonWithVaultPathFlags(testConfig.path, vault.path)

      const config = ConfigSchema.parse({
        plugins: [],
        sync: {
          files: [
            {
              source: 'configs/invalid-plugin.json',
              target: 'data.json',
              type: 'plugin',
              // Missing pluginId
            },
          ],
        },
      })

      const result = await syncPluginVaultIterator({
        vault,
        config,
        flags: {
          ...flags,
          overwrite: true,
          backup: true,
          onlyInstalled: true,
          mergeStrategy: 'replace',
        },
      })

      expect(result.synced).toBe(0)
      expect(result.skipped).toBe(1)
      expect(syncProvider.syncPluginConfigToVault).not.toHaveBeenCalled()

      destroyVault(vault.path)
    })

    it('should only sync plugin type entries', async () => {
      const { vault, config: testConfig } = await testVaultSetup()
      const flags = getTestCommonWithVaultPathFlags(testConfig.path, vault.path)

      const config = ConfigSchema.parse({
        plugins: [],
        sync: {
          files: [
            {
              source: 'configs/test-plugin-data.json',
              target: 'data.json',
              type: 'plugin',
              pluginId: 'test-plugin',
            },
            {
              source: 'configs/app.json',
              target: 'app.json',
              type: 'core',
            },
          ],
        },
      })

      const result = await syncPluginVaultIterator({
        vault,
        config,
        flags: {
          ...flags,
          overwrite: true,
          backup: true,
          onlyInstalled: true,
          mergeStrategy: 'replace',
        },
      })

      expect(result.synced).toBe(1)
      expect(result.skipped).toBe(0)
      expect(syncProvider.syncPluginConfigToVault).toHaveBeenCalledTimes(1)

      destroyVault(vault.path)
    })

    it('should sync Note Toolbar plugin config to specific vaults only', async () => {
      const { vault, config: testConfig } = await testVaultSetup()
      const flags = getTestCommonWithVaultPathFlags(testConfig.path, vault.path)

      // Create Note Toolbar plugin directory
      const noteToolbarPath = join(
        vault.path,
        '.obsidian',
        'plugins',
        'note-toolbar',
      )
      mkdirSync(noteToolbarPath, { recursive: true })
      writeFileSync(
        join(noteToolbarPath, 'manifest.json'),
        JSON.stringify({ id: 'note-toolbar', name: 'Note Toolbar' }),
      )

      const config = ConfigSchema.parse({
        plugins: [],
        sync: {
          files: [
            {
              source: 'configs/note-toolbar-config.json',
              target: 'data.json',
              type: 'plugin',
              pluginId: 'note-toolbar',
              vaults: [
                vault.name,
                'Vault2',
                'Vault3',
                'Vault4',
                'Vault5',
                'Vault6',
                'Vault7',
                'Vault8',
              ], // 8 of 15 vaults
              mergeStrategy: 'smart',
              include: ['toolbars', 'showOnMobile'],
            },
          ],
        },
      })

      const result = await syncPluginVaultIterator({
        vault,
        config,
        flags: {
          ...flags,
          overwrite: true,
          backup: true,
          onlyInstalled: true,
          mergeStrategy: 'replace',
        },
      })

      expect(result.synced).toBe(1)
      expect(result.skipped).toBe(0)
      expect(syncProvider.syncPluginConfigToVault).toHaveBeenCalledTimes(1)
      expect(syncProvider.syncPluginConfigToVault).toHaveBeenCalledWith(
        expect.objectContaining({
          source: expect.stringContaining(
            path.join('configs', 'note-toolbar-config.json'),
          ),
          target: 'data.json',
          mergeStrategy: 'smart',
          include: ['toolbars', 'showOnMobile'],
          exclude: undefined,
          overwrite: true,
          backup: true,
          onlyIfInstalled: true,
        }),
      )

      destroyVault(vault.path)
    })

    it('should sync Commander plugin config to different set of vaults', async () => {
      const { vault, config: testConfig } = await testVaultSetup()
      const flags = getTestCommonWithVaultPathFlags(testConfig.path, vault.path)

      // Create Commander plugin directory
      const commanderPath = join(vault.path, '.obsidian', 'plugins', 'cmdr')
      mkdirSync(commanderPath, { recursive: true })
      writeFileSync(
        join(commanderPath, 'manifest.json'),
        JSON.stringify({ id: 'cmdr', name: 'Commander' }),
      )

      const config = ConfigSchema.parse({
        plugins: [],
        sync: {
          files: [
            {
              source: 'configs/commander-config.json',
              target: 'data.json',
              type: 'plugin',
              pluginId: 'cmdr',
              vaults: [vault.name, 'Vault9', 'Vault10', 'Vault11'], // 4 different vaults
              mergeStrategy: 'replace',
            },
          ],
        },
      })

      const result = await syncPluginVaultIterator({
        vault,
        config,
        flags: {
          ...flags,
          overwrite: true,
          backup: true,
          onlyInstalled: true,
          mergeStrategy: 'smart',
        },
      })

      expect(result.synced).toBe(1)
      expect(result.skipped).toBe(0)
      expect(syncProvider.syncPluginConfigToVault).toHaveBeenCalledTimes(1)
      expect(syncProvider.syncPluginConfigToVault).toHaveBeenCalledWith(
        expect.objectContaining({
          source: expect.stringContaining(
            path.join('configs', 'commander-config.json'),
          ),
          target: 'data.json',
          mergeStrategy: 'replace',
          include: undefined,
          exclude: undefined,
          overwrite: true,
          backup: true,
          onlyIfInstalled: true,
        }),
      )

      destroyVault(vault.path)
    })

    it('should handle sync multiple plugins to different vault sets', async () => {
      const { vault, config: testConfig } = await testVaultSetup()
      const flags = getTestCommonWithVaultPathFlags(testConfig.path, vault.path)

      // Create both plugins
      const noteToolbarPath = join(
        vault.path,
        '.obsidian',
        'plugins',
        'note-toolbar',
      )
      mkdirSync(noteToolbarPath, { recursive: true })
      writeFileSync(
        join(noteToolbarPath, 'manifest.json'),
        JSON.stringify({ id: 'note-toolbar', name: 'Note Toolbar' }),
      )

      const commanderPath = join(vault.path, '.obsidian', 'plugins', 'cmdr')
      mkdirSync(commanderPath, { recursive: true })
      writeFileSync(
        join(commanderPath, 'manifest.json'),
        JSON.stringify({ id: 'cmdr', name: 'Commander' }),
      )

      // Simulate the exact scenario from the feature request:
      // - 15 vaults total
      // - Note Toolbar config to 8 vaults
      // - Commander config to 4 vaults
      // - This vault should get both configs
      const config = ConfigSchema.parse({
        plugins: [],
        sync: {
          files: [
            {
              source: 'configs/note-toolbar-settings.json',
              target: 'data.json',
              type: 'plugin',
              pluginId: 'note-toolbar',
              vaults: [
                vault.name,
                'WorkVault',
                'StudyVault',
                'PersonalVault',
                'ProjectsVault',
                'ResearchVault',
                'WritingVault',
                'ArchiveVault',
              ], // 8 vaults
              mergeStrategy: 'smart',
              include: ['toolbars', 'position', 'showOnMobile'],
            },
            {
              source: 'configs/commander-settings.json',
              target: 'data.json',
              type: 'plugin',
              pluginId: 'cmdr',
              vaults: [vault.name, 'DevVault', 'AdminVault', 'DocsVault'], // 4 vaults (overlapping with Note Toolbar)
              mergeStrategy: 'replace',
            },
            {
              source: 'configs/dataview-settings.json',
              target: 'data.json',
              type: 'plugin',
              pluginId: 'dataview',
              vaults: ['NotThisVault'],
            },
          ],
        },
      })

      const result = await syncPluginVaultIterator({
        vault,
        config,
        flags: {
          ...flags,
          overwrite: true,
          backup: true,
          onlyInstalled: true,
          mergeStrategy: 'merge',
        },
      })

      expect(result.synced).toBe(2) // Note Toolbar + Commander
      expect(result.skipped).toBe(0) // Dataview is filtered by vault, not skipped due to error
      expect(syncProvider.syncPluginConfigToVault).toHaveBeenCalledTimes(2)

      // Verify Note Toolbar sync
      expect(syncProvider.syncPluginConfigToVault).toHaveBeenCalledWith(
        expect.objectContaining({
          source: expect.stringContaining(
            path.join('configs', 'note-toolbar-settings.json'),
          ),
          target: 'data.json',
          mergeStrategy: 'smart',
          include: ['toolbars', 'position', 'showOnMobile'],
          exclude: undefined,
          overwrite: true,
          backup: true,
          onlyIfInstalled: true,
        }),
      )

      // Verify Commander sync
      expect(syncProvider.syncPluginConfigToVault).toHaveBeenCalledWith(
        expect.objectContaining({
          source: expect.stringContaining(
            path.join('configs', 'commander-settings.json'),
          ),
          target: 'data.json',
          mergeStrategy: 'replace',
          include: undefined,
          exclude: undefined,
          overwrite: true,
          backup: true,
          onlyIfInstalled: true,
        }),
      )

      destroyVault(vault.path)
    })

    it('should skip plugin sync when plugin not installed and onlyIfInstalled is true', async () => {
      const { vault, config: testConfig } = await testVaultSetup()
      const flags = getTestCommonWithVaultPathFlags(testConfig.path, vault.path)

      // Don't create plugin directory - simulate uninstalled plugin
      const config = ConfigSchema.parse({
        plugins: [],
        sync: {
          files: [
            {
              source: 'configs/uninstalled-plugin-config.json',
              target: 'data.json',
              type: 'plugin',
              pluginId: 'uninstalled-plugin',
              vaults: [vault.name],
            },
          ],
        },
      })

      // Mock the syncPluginConfigToVault to return false (plugin not installed)
      vi.mocked(syncProvider.syncPluginConfigToVault).mockResolvedValue(false)

      const result = await syncPluginVaultIterator({
        vault,
        config,
        flags: {
          ...flags,
          overwrite: true,
          backup: true,
          onlyInstalled: true,
          mergeStrategy: 'replace',
        },
      })

      expect(result.synced).toBe(0)
      expect(result.skipped).toBe(1)
      expect(syncProvider.syncPluginConfigToVault).toHaveBeenCalledTimes(1)

      destroyVault(vault.path)
    })

    it('should correctly pass parameters to the sync provider', async () => {
      const { vault, config: testConfig } = await testVaultSetup()
      const flags = getTestCommonWithVaultPathFlags(testConfig.path, vault.path)

      const config = ConfigSchema.parse({
        plugins: [],
        sync: {
          files: [
            {
              source: 'configs/note-toolbar-config.json',
              target: 'data.json',
              type: 'plugin',
              pluginId: 'test-plugin',
              vaults: [vault.name],
              mergeStrategy: 'smart',
              include: ['toolbars'],
              exclude: ['some-setting'],
            },
          ],
        },
      })

      await syncPluginVaultIterator({
        vault,
        config,
        flags: {
          ...flags,
          overwrite: true,
          backup: true,
          onlyInstalled: true,
          mergeStrategy: 'replace', // This should be overridden by the file-specific config
        },
      })

      expect(syncProvider.syncPluginConfigToVault).toHaveBeenCalledWith(
        expect.objectContaining({
          source: expect.stringContaining(
            path.join('configs', 'note-toolbar-config.json'),
          ),
          target: 'data.json',
          pluginId: 'test-plugin',
          vaultPath: vault.path,
          mergeStrategy: 'smart', // Expect file-specific strategy
          include: ['toolbars'],
          exclude: ['some-setting'],
          overwrite: true,
          backup: true,
          onlyIfInstalled: true,
        }),
      )

      destroyVault(vault.path)
    })

    it('should skip syncing if vault is not in the list', async () => {
      const { vault, config: testConfig } = await testVaultSetup()
      const flags = getTestCommonWithVaultPathFlags(testConfig.path, vault.path)

      const config = ConfigSchema.parse({
        plugins: [],
        sync: {
          files: [
            {
              source: 'configs/test-plugin-data.json',
              target: 'data.json',
              type: 'plugin',
              pluginId: 'test-plugin',
              vaults: ['AnotherVault'],
            },
          ],
        },
      })

      const result = await syncPluginVaultIterator({
        vault,
        config,
        flags: {
          ...flags,
          overwrite: true,
          backup: true,
          onlyInstalled: true,
          mergeStrategy: 'replace',
        },
      })

      expect(result.synced).toBe(0)
      expect(result.skipped).toBe(0) // It's not a skip, it's a filter
      expect(syncProvider.syncPluginConfigToVault).not.toHaveBeenCalled()

      destroyVault(vault.path)
    })

    it('should sync multiple plugins if conditions are met', async () => {
      const { vault, config: testConfig } = await testVaultSetup()
      const flags = getTestCommonWithVaultPathFlags(testConfig.path, vault.path)

      // Create another plugin
      const anotherPluginPath = join(
        vault.path,
        '.obsidian',
        'plugins',
        'another-plugin',
      )
      mkdirSync(anotherPluginPath, { recursive: true })
      writeFileSync(
        join(anotherPluginPath, 'manifest.json'),
        JSON.stringify({
          id: 'another-plugin',
          name: 'Another Plugin',
        }),
      )

      const config = ConfigSchema.parse({
        plugins: [],
        sync: {
          files: [
            {
              source: 'configs/test-plugin-data.json',
              target: 'data.json',
              type: 'plugin',
              pluginId: 'test-plugin',
            },
            {
              source: 'configs/another-plugin-data.json',
              target: 'data.json',
              type: 'plugin',
              pluginId: 'another-plugin',
            },
            {
              source: 'configs/not-installed-plugin.json',
              target: 'data.json',
              type: 'plugin',
              pluginId: 'not-installed',
            },
          ],
        },
      })

      const result = await syncPluginVaultIterator({
        vault,
        config,
        flags: {
          ...flags,
          onlyInstalled: true,
          overwrite: true,
          backup: true,
          mergeStrategy: 'replace',
        },
      })

      expect(result.synced).toBe(3)
      expect(result.skipped).toBe(0) // All plugins are installed, none skipped
      expect(syncProvider.syncPluginConfigToVault).toHaveBeenCalledTimes(3)

      destroyVault(vault.path)
    })
  })
})
