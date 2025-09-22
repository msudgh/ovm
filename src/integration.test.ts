import { mkdirSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { dirname, join } from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as syncProvider from './providers/sync'
import { ConfigSchema } from './services/config'
import { SyncEntry } from './services/config/index.types'
import { syncPluginVaultIterator } from './services/plugin/pluginSync'
import { syncVaultCoreIterator } from './services/vault/vaultSync'
import {
  createTestPlugin,
  destroyVault,
  getTestCommonWithVaultPathFlags,
  setupVault,
} from './utils/testing'

vi.mock('./providers/sync', async () => {
  const actual = await vi.importActual('./providers/sync')
  return {
    ...actual,
    syncFileToVault: vi.fn(),
    syncPluginConfigToVault: vi.fn(),
  }
})

const createSyncConfig = (files: SyncEntry[]) => {
  return ConfigSchema.parse({
    plugins: [],
    sync: { files },
  })
}

const getDefaultFlags = (configPath: string, vaultPath: string) => ({
  ...getTestCommonWithVaultPathFlags(configPath, vaultPath),
  overwrite: true,
  backup: true,
  onlyInstalled: true,
  mergeStrategy: 'replace' as const,
})

const expectSyncCalls = (coreCount: number, pluginCount: number) => {
  expect(syncProvider.syncFileToVault).toHaveBeenCalledTimes(coreCount)
  expect(syncProvider.syncPluginConfigToVault).toHaveBeenCalledTimes(
    pluginCount,
  )
}

describe('Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(syncProvider.syncFileToVault).mockResolvedValue(true)
    vi.mocked(syncProvider.syncPluginConfigToVault).mockResolvedValue(true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Vault & Plugin Sync', () => {
    it('should correctly orchestrate core and plugin sync across multiple vaults', async () => {
      // Setup: Create two vaults, "Work" and "Personal"
      const { vault: workVault, config: workConfig } = await setupVault()
      workVault.name = 'Work'
      const { vault: personalVault, config: personalConfig } =
        await setupVault()
      personalVault.name = 'Personal'

      // Install 'test-plugin' in both vaults
      const pluginDirWork = join(
        workVault.path,
        '.obsidian',
        'plugins',
        'test-plugin',
      )
      mkdirSync(pluginDirWork, { recursive: true })
      writeFileSync(
        join(pluginDirWork, 'manifest.json'),
        JSON.stringify({ id: 'test-plugin', name: 'Test Plugin' }),
      )
      const pluginDirPersonal = join(
        personalVault.path,
        '.obsidian',
        'plugins',
        'test-plugin',
      )
      mkdirSync(pluginDirPersonal, { recursive: true })
      writeFileSync(
        join(pluginDirPersonal, 'manifest.json'),
        JSON.stringify({ id: 'test-plugin', name: 'Test Plugin' }),
      )

      // Define a configuration that syncs a core file to "Work" and a plugin to "Personal"
      const config = ConfigSchema.parse({
        plugins: [],
        sync: {
          files: [
            {
              source: 'configs/app.json',
              target: 'app.json',
              type: 'core',
              vaults: ['Work'],
            },
            {
              source: 'configs/test-plugin-data.json',
              target: 'data.json',
              type: 'plugin',
              pluginId: 'test-plugin',
              vaults: ['Personal'],
            },
          ],
        },
      })

      const workFlags = {
        ...getTestCommonWithVaultPathFlags(workConfig.path, workVault.path),
        overwrite: true,
        backup: true,
        onlyInstalled: true,
        mergeStrategy: 'replace',
      }

      const personalFlags = {
        ...getTestCommonWithVaultPathFlags(
          personalConfig.path,
          personalVault.path,
        ),
        overwrite: true,
        backup: true,
        onlyInstalled: true,
        mergeStrategy: 'replace',
      }

      // Sync for "Work" vault
      await syncVaultCoreIterator({
        vault: workVault,
        config,
        flags: workFlags,
      })
      await syncPluginVaultIterator({
        vault: workVault,
        config,
        flags: workFlags,
      })

      // Sync for "Personal" vault
      await syncVaultCoreIterator({
        vault: personalVault,
        config,
        flags: personalFlags,
      })
      await syncPluginVaultIterator({
        vault: personalVault,
        config,
        flags: personalFlags,
      })

      // Assertions for "Work" vault
      expect(syncProvider.syncFileToVault).toHaveBeenCalledWith(
        expect.objectContaining({
          vaultPath: workVault.path,
          target: 'app.json',
        }),
      )
      expect(syncProvider.syncPluginConfigToVault).not.toHaveBeenCalledWith(
        expect.objectContaining({
          vaultPath: workVault.path,
        }),
      )

      // Assertions for "Personal" vault
      expect(syncProvider.syncFileToVault).not.toHaveBeenCalledWith(
        expect.objectContaining({
          vaultPath: personalVault.path,
        }),
      )
      expect(syncProvider.syncPluginConfigToVault).toHaveBeenCalledWith(
        expect.objectContaining({
          vaultPath: personalVault.path,
          pluginId: 'test-plugin',
        }),
      )

      // Cleanup
      destroyVault(workVault.path)
      destroyVault(personalVault.path)
    })

    it('should handle baseDir for core file sync', async () => {
      const tempBaseDir = join(tmpdir(), `ovm-test-basedir-${Date.now()}`)

      mkdirSync(tempBaseDir, { recursive: true })

      const coreConfigFile = 'core-settings.json'
      const coreConfigContent = { theme: 'dark' }

      writeFileSync(
        join(tempBaseDir, coreConfigFile),
        JSON.stringify(coreConfigContent),
      )

      const { vault, config: vaultConfig } = await setupVault()
      vault.name = 'TestVault'

      const config = ConfigSchema.parse({
        plugins: [],
        sync: {
          baseDir: tempBaseDir,
          files: [
            {
              source: coreConfigFile,
              target: 'app.json',
              type: 'core',
              vaults: [vault.name],
            },
          ],
        },
      })

      const flags = {
        ...getTestCommonWithVaultPathFlags(vaultConfig.path, vault.path),
        overwrite: true,
        backup: false,
        onlyInstalled: false,
        mergeStrategy: 'replace',
      }

      await syncVaultCoreIterator({ vault, config, flags })

      expect(syncProvider.syncFileToVault).toHaveBeenCalledWith(
        expect.objectContaining({
          source: join(tempBaseDir, coreConfigFile),
          vaultPath: vault.path,
          target: 'app.json',
        }),
      )

      destroyVault(vault.path)
      destroyVault(tempBaseDir)
    })

    it('should sync both core and plugin configs to the same vault with different merge strategies', async () => {
      const { vault, config: vaultConfig } = await setupVault()
      vault.name = 'IntegrationVault'

      // Install multiple plugins using helper
      const plugins = ['note-toolbar', 'commander', 'dataview']
      plugins.forEach((pluginId) => createTestPlugin(vault.path, pluginId))

      const config = createSyncConfig([
        {
          source: 'configs/app.json',
          target: 'app.json',
          type: 'core',
          vaults: [vault.name],
          mergeStrategy: 'smart',
          onlyIfInstalled: false,
        },
        {
          source: 'configs/workspace.json',
          target: 'workspace.json',
          type: 'core',
          vaults: [vault.name],
          mergeStrategy: 'replace',
          onlyIfInstalled: false,
        },
        {
          source: 'configs/note-toolbar-settings.json',
          target: 'data.json',
          type: 'plugin',
          pluginId: 'note-toolbar',
          vaults: [vault.name],
          mergeStrategy: 'merge',
          onlyIfInstalled: true,
        },
        {
          source: 'configs/commander-settings.json',
          target: 'data.json',
          type: 'plugin',
          pluginId: 'commander',
          vaults: [vault.name],
          mergeStrategy: 'smart',
          include: ['commands'],
          onlyIfInstalled: true,
        },
      ])

      const flags = {
        ...getDefaultFlags(vaultConfig.path, vault.path),
        mergeStrategy: 'replace', // Should be overridden by file-specific strategies
      }

      // Execute both sync operations
      const coreResult = await syncVaultCoreIterator({ vault, config, flags })
      const pluginResult = await syncPluginVaultIterator({
        vault,
        config,
        flags,
      })

      // Verify results
      expect(coreResult.synced).toBe(2) // app.json + workspace.json
      expect(coreResult.skipped).toBe(0)
      expect(pluginResult.synced).toBe(2) // note-toolbar + commander
      expect(pluginResult.skipped).toBe(0)

      // Verify core sync calls with correct merge strategies
      expect(syncProvider.syncFileToVault).toHaveBeenCalledWith(
        expect.objectContaining({
          target: 'app.json',
          mergeStrategy: 'smart',
          vaultPath: vault.path,
        }),
      )
      expect(syncProvider.syncFileToVault).toHaveBeenCalledWith(
        expect.objectContaining({
          target: 'workspace.json',
          mergeStrategy: 'replace',
          vaultPath: vault.path,
        }),
      )

      // Verify plugin sync calls with correct configurations
      expect(syncProvider.syncPluginConfigToVault).toHaveBeenCalledWith(
        expect.objectContaining({
          pluginId: 'note-toolbar',
          mergeStrategy: 'merge',
          vaultPath: vault.path,
        }),
      )
      expect(syncProvider.syncPluginConfigToVault).toHaveBeenCalledWith(
        expect.objectContaining({
          pluginId: 'commander',
          mergeStrategy: 'smart',
          include: ['commands'],
          vaultPath: vault.path,
        }),
      )

      destroyVault(vault.path)
    })

    it('should handle mixed success/failure scenarios across vault and plugin sync', async () => {
      const { vault, config: vaultConfig } = await setupVault()
      vault.name = 'MixedResultsVault'

      // Install one plugin but not another
      const installedPluginDir = join(
        vault.path,
        '.obsidian',
        'plugins',
        'installed-plugin',
      )
      mkdirSync(installedPluginDir, { recursive: true })
      writeFileSync(
        join(installedPluginDir, 'manifest.json'),
        JSON.stringify({ id: 'installed-plugin', name: 'Installed Plugin' }),
      )

      const config = ConfigSchema.parse({
        plugins: [],
        sync: {
          files: [
            {
              source: 'configs/app.json',
              target: 'app.json',
              type: 'core',
              vaults: [vault.name],
            },
            {
              source: 'configs/installed-plugin-data.json',
              target: 'data.json',
              type: 'plugin',
              pluginId: 'installed-plugin',
              vaults: [vault.name],
            },
            {
              source: 'configs/missing-plugin-data.json',
              target: 'data.json',
              type: 'plugin',
              pluginId: 'missing-plugin',
              vaults: [vault.name],
            },
          ],
        },
      })

      // Mock mixed results
      vi.mocked(syncProvider.syncFileToVault).mockResolvedValue(true)
      vi.mocked(syncProvider.syncPluginConfigToVault)
        .mockResolvedValueOnce(true) // installed-plugin succeeds
        .mockResolvedValueOnce(false) // missing-plugin fails

      const flags = {
        ...getTestCommonWithVaultPathFlags(vaultConfig.path, vault.path),
        overwrite: true,
        backup: true,
        onlyInstalled: true,
        mergeStrategy: 'replace',
      }

      const coreResult = await syncVaultCoreIterator({ vault, config, flags })
      const pluginResult = await syncPluginVaultIterator({
        vault,
        config,
        flags,
      })

      // Verify mixed results are handled correctly
      expect(coreResult.synced).toBe(1)
      expect(coreResult.skipped).toBe(0)
      expect(pluginResult.synced).toBe(1) // Only installed plugin
      expect(pluginResult.skipped).toBe(1) // Missing plugin skipped

      destroyVault(vault.path)
    })

    it('should respect vault filtering across both core and plugin sync', async () => {
      const { vault: vault1, config: config1 } = await setupVault()
      const { vault: vault2, config: config2 } = await setupVault()
      vault1.name = 'TargetVault'
      vault2.name = 'OtherVault'

      // Install plugin in both vaults
      for (const vault of [vault1, vault2]) {
        const pluginDir = join(
          vault.path,
          '.obsidian',
          'plugins',
          'test-plugin',
        )
        mkdirSync(pluginDir, { recursive: true })
        writeFileSync(
          join(pluginDir, 'manifest.json'),
          JSON.stringify({ id: 'test-plugin', name: 'Test Plugin' }),
        )
      }

      const config = ConfigSchema.parse({
        plugins: [],
        sync: {
          files: [
            {
              source: 'configs/app.json',
              target: 'app.json',
              type: 'core',
              vaults: ['TargetVault'], // Only vault1
            },
            {
              source: 'configs/test-plugin-data.json',
              target: 'data.json',
              type: 'plugin',
              pluginId: 'test-plugin',
              vaults: ['TargetVault'], // Only vault1
            },
          ],
        },
      })

      // Test vault1 (should sync)
      const flags1 = {
        ...getTestCommonWithVaultPathFlags(config1.path, vault1.path),
        overwrite: true,
        backup: true,
        onlyInstalled: true,
        mergeStrategy: 'replace',
      }

      const coreResult1 = await syncVaultCoreIterator({
        vault: vault1,
        config,
        flags: flags1,
      })
      const pluginResult1 = await syncPluginVaultIterator({
        vault: vault1,
        config,
        flags: flags1,
      })

      // Test vault2 (should not sync due to vault filtering)
      const flags2 = {
        ...getTestCommonWithVaultPathFlags(config2.path, vault2.path),
        overwrite: true,
        backup: true,
        onlyInstalled: true,
        mergeStrategy: 'replace',
      }

      const coreResult2 = await syncVaultCoreIterator({
        vault: vault2,
        config,
        flags: flags2,
      })
      const pluginResult2 = await syncPluginVaultIterator({
        vault: vault2,
        config,
        flags: flags2,
      })

      // Verify vault1 synced
      expect(coreResult1.synced).toBe(1)
      expect(pluginResult1.synced).toBe(1)

      // Verify vault2 was filtered out
      expect(coreResult2.synced).toBe(0)
      expect(pluginResult2.synced).toBe(0)

      // Verify sync was only called for vault1
      expect(syncProvider.syncFileToVault).toHaveBeenCalledWith(
        expect.objectContaining({ vaultPath: vault1.path }),
      )
      expect(syncProvider.syncPluginConfigToVault).toHaveBeenCalledWith(
        expect.objectContaining({ vaultPath: vault1.path }),
      )

      expect(syncProvider.syncFileToVault).not.toHaveBeenCalledWith(
        expect.objectContaining({ vaultPath: vault2.path }),
      )
      expect(syncProvider.syncPluginConfigToVault).not.toHaveBeenCalledWith(
        expect.objectContaining({ vaultPath: vault2.path }),
      )

      destroyVault(vault1.path)
      destroyVault(vault2.path)
    })

    it('should handle baseDir resolution consistently across core and plugin sync', async () => {
      const tempBaseDir = join(tmpdir(), `ovm-integration-test-${Date.now()}`)
      mkdirSync(tempBaseDir, { recursive: true })

      // Create config files in baseDir
      const coreConfigPath = join(tempBaseDir, 'core-config.json')
      const pluginConfigPath = join(tempBaseDir, 'plugin-config.json')

      writeFileSync(coreConfigPath, JSON.stringify({ theme: 'dark' }))
      writeFileSync(pluginConfigPath, JSON.stringify({ enabled: true }))

      const { vault, config: vaultConfig } = await setupVault()
      vault.name = 'BaseDirVault'

      // Install plugin
      const pluginDir = join(vault.path, '.obsidian', 'plugins', 'test-plugin')
      mkdirSync(pluginDir, { recursive: true })
      writeFileSync(
        join(pluginDir, 'manifest.json'),
        JSON.stringify({ id: 'test-plugin', name: 'Test Plugin' }),
      )

      const config = ConfigSchema.parse({
        plugins: [],
        sync: {
          baseDir: tempBaseDir,
          files: [
            {
              source: 'core-config.json',
              target: 'app.json',
              type: 'core',
              vaults: [vault.name],
            },
            {
              source: 'plugin-config.json',
              target: 'data.json',
              type: 'plugin',
              pluginId: 'test-plugin',
              vaults: [vault.name],
            },
          ],
        },
      })

      const flags = {
        ...getTestCommonWithVaultPathFlags(vaultConfig.path, vault.path),
        overwrite: true,
        backup: false,
        onlyInstalled: true,
        mergeStrategy: 'replace',
      }

      await syncVaultCoreIterator({ vault, config, flags })
      await syncPluginVaultIterator({ vault, config, flags })

      // Verify both sync operations used the correct resolved paths
      expect(syncProvider.syncFileToVault).toHaveBeenCalledWith(
        expect.objectContaining({
          source: coreConfigPath,
          target: 'app.json',
          vaultPath: vault.path,
        }),
      )

      expect(syncProvider.syncPluginConfigToVault).toHaveBeenCalledWith(
        expect.objectContaining({
          source: pluginConfigPath,
          target: 'data.json',
          pluginId: 'test-plugin',
          vaultPath: vault.path,
        }),
      )

      destroyVault(vault.path)
      destroyVault(tempBaseDir)
    })

    describe('Error Handling & Recovery', () => {
      it('should handle sync provider failures gracefully', async () => {
        const { vault, config: vaultConfig } = await setupVault()
        vault.name = 'ErrorTestVault'

        // Install plugin
        const pluginDir = join(
          vault.path,
          '.obsidian',
          'plugins',
          'test-plugin',
        )
        mkdirSync(pluginDir, { recursive: true })
        writeFileSync(
          join(pluginDir, 'manifest.json'),
          JSON.stringify({ id: 'test-plugin', name: 'Test Plugin' }),
        )

        const config = ConfigSchema.parse({
          plugins: [],
          sync: {
            files: [
              {
                source: 'configs/app.json',
                target: 'app.json',
                type: 'core',
                vaults: [vault.name],
              },
              {
                source: 'configs/plugin-data.json',
                target: 'data.json',
                type: 'plugin',
                pluginId: 'test-plugin',
                vaults: [vault.name],
              },
            ],
          },
        })

        // Mock provider to throw errors
        vi.mocked(syncProvider.syncFileToVault).mockRejectedValue(
          new Error('Core sync failed'),
        )
        vi.mocked(syncProvider.syncPluginConfigToVault).mockRejectedValue(
          new Error('Plugin sync failed'),
        )

        const flags = {
          ...getTestCommonWithVaultPathFlags(vaultConfig.path, vault.path),
          overwrite: true,
          backup: true,
          onlyInstalled: true,
          mergeStrategy: 'replace',
        }

        // Should handle errors gracefully without crashing
        await expect(async () => {
          await syncVaultCoreIterator({ vault, config, flags })
        }).rejects.toThrow('Core sync failed')

        await expect(async () => {
          await syncPluginVaultIterator({ vault, config, flags })
        }).rejects.toThrow('Plugin sync failed')

        destroyVault(vault.path)
      })

      it('should continue partial sync when some operations fail', async () => {
        const { vault, config: vaultConfig } = await setupVault()
        vault.name = 'PartialFailureVault'

        const config = ConfigSchema.parse({
          plugins: [],
          sync: {
            files: [
              {
                source: 'configs/success-file.json',
                target: 'success.json',
                type: 'core',
                vaults: [vault.name],
              },
              {
                source: 'configs/failure-file.json',
                target: 'failure.json',
                type: 'core',
                vaults: [vault.name],
              },
            ],
          },
        })

        // Mock mixed success/failure
        vi.mocked(syncProvider.syncFileToVault)
          .mockResolvedValueOnce(true) // success-file.json succeeds
          .mockRejectedValueOnce(new Error('File sync failed')) // failure-file.json fails

        const flags = {
          ...getTestCommonWithVaultPathFlags(vaultConfig.path, vault.path),
          overwrite: true,
          backup: true,
          onlyInstalled: true,
          mergeStrategy: 'replace',
        }

        // Should handle partial failures gracefully
        await expect(async () => {
          await syncVaultCoreIterator({ vault, config, flags })
        }).rejects.toThrow('File sync failed')

        destroyVault(vault.path)
      })

      it('should handle corrupted vault structure', async () => {
        const { vault, config: vaultConfig } = await setupVault()
        vault.name = 'CorruptedVault'

        // Corrupt the .obsidian directory structure
        const obsidianDir = join(vault.path, '.obsidian')
        const pluginsDir = join(obsidianDir, 'plugins')
        mkdirSync(pluginsDir, { recursive: true })

        // Create a file where a directory should be
        writeFileSync(
          join(pluginsDir, 'corrupted-plugin'),
          'this should be a directory',
        )

        const config = ConfigSchema.parse({
          plugins: [],
          sync: {
            files: [
              {
                source: 'configs/plugin-data.json',
                target: 'data.json',
                type: 'plugin',
                pluginId: 'corrupted-plugin',
                vaults: [vault.name],
              },
            ],
          },
        })

        const flags = {
          ...getTestCommonWithVaultPathFlags(vaultConfig.path, vault.path),
          overwrite: true,
          backup: true,
          onlyInstalled: true,
          mergeStrategy: 'replace',
        }

        // Should handle corrupted structure gracefully
        const result = await syncPluginVaultIterator({ vault, config, flags })
        expect(result.skipped).toBe(1) // Should skip corrupted plugin

        destroyVault(vault.path)
      })
    })

    describe('Performance & Scale Testing', () => {
      it('should handle large number of sync operations efficiently', async () => {
        const { vault, config: vaultConfig } = await setupVault()
        vault.name = 'LargeScaleVault'

        // Create many plugins
        const pluginCount = 50
        const plugins = Array.from(
          { length: pluginCount },
          (_, i) => `plugin-${i}`,
        )

        for (const pluginId of plugins) {
          const pluginDir = join(vault.path, '.obsidian', 'plugins', pluginId)
          mkdirSync(pluginDir, { recursive: true })
          writeFileSync(
            join(pluginDir, 'manifest.json'),
            JSON.stringify({ id: pluginId, name: `Plugin ${pluginId}` }),
          )
        }

        const syncFiles = [
          // Core files
          ...Array.from({ length: 10 }, (_, i) => ({
            source: `configs/core-${i}.json`,
            target: `core-${i}.json`,
            type: 'core' as const,
            vaults: [vault.name],
          })),
          // Plugin files
          ...plugins.map((pluginId) => ({
            source: `configs/${pluginId}-data.json`,
            target: 'data.json',
            type: 'plugin' as const,
            pluginId,
            vaults: [vault.name],
          })),
        ]

        const config = ConfigSchema.parse({
          plugins: [],
          sync: { files: syncFiles },
        })

        const flags = {
          ...getTestCommonWithVaultPathFlags(vaultConfig.path, vault.path),
          overwrite: true,
          backup: true,
          onlyInstalled: true,
          mergeStrategy: 'replace',
        }

        const startTime = Date.now()

        await syncVaultCoreIterator({ vault, config, flags })
        await syncPluginVaultIterator({ vault, config, flags })

        const duration = Date.now() - startTime

        // Verify all operations completed
        expect(syncProvider.syncFileToVault).toHaveBeenCalledTimes(10) // Core files
        expect(syncProvider.syncPluginConfigToVault).toHaveBeenCalledTimes(
          pluginCount,
        ) // Plugin files

        // Performance check - should complete within reasonable time
        expect(duration).toBeLessThan(5000) // 5 seconds max

        destroyVault(vault.path)
      })
    })

    describe('Configuration Edge Cases', () => {
      it('should handle empty configuration gracefully', async () => {
        const { vault, config: vaultConfig } = await setupVault()

        const config = ConfigSchema.parse({
          plugins: [],
          sync: { files: [] }, // Empty sync configuration
        })

        const flags = {
          ...getTestCommonWithVaultPathFlags(vaultConfig.path, vault.path),
          overwrite: true,
          backup: true,
          onlyInstalled: true,
          mergeStrategy: 'replace',
        }

        const coreResult = await syncVaultCoreIterator({ vault, config, flags })
        const pluginResult = await syncPluginVaultIterator({
          vault,
          config,
          flags,
        })

        expect(coreResult.synced).toBe(0)
        expect(coreResult.skipped).toBe(0)
        expect(pluginResult.synced).toBe(0)
        expect(pluginResult.skipped).toBe(0)

        destroyVault(vault.path)
      })

      it('should validate configuration constraints across sync operations', async () => {
        const { vault, config: vaultConfig } = await setupVault()
        vault.name = 'ConstraintTestVault'

        // Install plugin
        const pluginDir = join(
          vault.path,
          '.obsidian',
          'plugins',
          'test-plugin',
        )
        mkdirSync(pluginDir, { recursive: true })
        writeFileSync(
          join(pluginDir, 'manifest.json'),
          JSON.stringify({ id: 'test-plugin', name: 'Test Plugin' }),
        )

        const config = ConfigSchema.parse({
          plugins: [],
          sync: {
            files: [
              {
                source: 'configs/same-target.json',
                target: 'conflicting.json', // Same target
                type: 'core',
                vaults: [vault.name],
              },
              {
                source: 'configs/another-same-target.json',
                target: 'conflicting.json', // Same target - potential conflict
                type: 'core',
                vaults: [vault.name],
              },
            ],
          },
        })

        const flags = {
          ...getTestCommonWithVaultPathFlags(vaultConfig.path, vault.path),
          overwrite: true,
          backup: true,
          onlyInstalled: true,
          mergeStrategy: 'replace',
        }

        // Should handle target conflicts appropriately
        const result = await syncVaultCoreIterator({ vault, config, flags })

        // Both should attempt to sync (last one wins with replace strategy)
        expect(result.synced).toBe(2)
        expect(syncProvider.syncFileToVault).toHaveBeenCalledTimes(2)

        destroyVault(vault.path)
      })
    })

    describe('Logging & Monitoring', () => {
      it('should provide detailed operation logs for debugging', async () => {
        const { vault, config: vaultConfig } = await setupVault()
        vault.name = 'LoggingTestVault'

        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
        const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})

        // Install plugin
        createTestPlugin(vault.path, 'test-plugin')

        const config = createSyncConfig([
          {
            source: 'configs/app.json',
            target: 'app.json',
            type: 'core',
            vaults: [vault.name],
            onlyIfInstalled: false,
            mergeStrategy: 'smart',
          },
          {
            source: 'configs/plugin-data.json',
            target: 'data.json',
            type: 'plugin',
            pluginId: 'test-plugin',
            vaults: [vault.name],
            onlyIfInstalled: false,
            mergeStrategy: 'merge',
          },
        ])

        const flags = {
          ...getDefaultFlags(vaultConfig.path, vault.path),
          debug: true, // Enable debug logging
        }

        await syncVaultCoreIterator({ vault, config, flags })
        await syncPluginVaultIterator({ vault, config, flags })

        expectSyncCalls(1, 1)

        logSpy.mockRestore()
        debugSpy.mockRestore()
        destroyVault(vault.path)
      })
    })

    describe('Real-world Data Integration', () => {
      it('should handle actual Obsidian config data structures', async () => {
        const { vault, config: vaultConfig } = await setupVault()
        vault.name = 'RealDataVault'

        // Create realistic config data
        const tempBaseDir = join(tmpdir(), `ovm-real-data-test-${Date.now()}`)
        mkdirSync(tempBaseDir, { recursive: true })

        // Real Obsidian app.json structure
        const realAppConfig = {
          legacyEditor: false,
          livePreview: true,
          theme: 'obsidian',
          cssTheme: 'Blue Topaz',
          translucency: false,
          enabledPlugins: ['dataview', 'templater-obsidian'],
          hotkeys: {
            'editor:toggle-bold': [{ modifiers: ['Mod'], key: 'b' }],
          },
          userIgnoreFilters: ['*.tmp', '*.log'],
        }

        // Real plugin data structure (Dataview plugin)
        const realPluginConfig = {
          enableDataviewJs: true,
          enableInlineDataview: true,
          enableInlineDataviewJs: true,
          prettyRenderInlineFields: true,
          dataviewJsKeyword: 'dataviewjs',
          inlineJsQueryPrefix: 'dv=',
          inlineQueriesInCodeblocks: true,
          enableInlineFieldHighlighting: true,
          enableInlineFieldHighlightingLivePreview: true,
          enableInlineFieldHighlightingReadingView: false,
        }

        writeFileSync(
          join(tempBaseDir, 'app.json'),
          JSON.stringify(realAppConfig, null, 2),
        )
        writeFileSync(
          join(tempBaseDir, 'dataview-settings.json'),
          JSON.stringify(realPluginConfig, null, 2),
        )

        // Install dataview plugin
        createTestPlugin(vault.path, 'dataview', 'Dataview')

        const config = ConfigSchema.parse({
          plugins: [],
          sync: {
            baseDir: tempBaseDir,
            files: [
              {
                source: 'app.json',
                target: 'app.json',
                type: 'core',
                vaults: [vault.name],
                mergeStrategy: 'smart',
              },
              {
                source: 'dataview-settings.json',
                target: 'data.json',
                type: 'plugin',
                pluginId: 'dataview',
                vaults: [vault.name],
                mergeStrategy: 'merge',
                include: ['enableDataviewJs', 'prettyRenderInlineFields'],
              },
            ],
          },
        })

        const flags = getDefaultFlags(vaultConfig.path, vault.path)

        await syncVaultCoreIterator({ vault, config, flags })
        await syncPluginVaultIterator({ vault, config, flags })

        // Verify real data structures are handled correctly
        expect(syncProvider.syncFileToVault).toHaveBeenCalledWith(
          expect.objectContaining({
            source: join(tempBaseDir, 'app.json'),
            target: 'app.json',
            mergeStrategy: 'smart',
            vaultPath: vault.path,
          }),
        )

        expect(syncProvider.syncPluginConfigToVault).toHaveBeenCalledWith(
          expect.objectContaining({
            source: join(tempBaseDir, 'dataview-settings.json'),
            target: 'data.json',
            pluginId: 'dataview',
            mergeStrategy: 'merge',
            include: ['enableDataviewJs', 'prettyRenderInlineFields'],
            vaultPath: vault.path,
          }),
        )

        destroyVault(vault.path)
        destroyVault(tempBaseDir)
      })

      it('should handle complex nested configuration merging', async () => {
        const { vault, config: vaultConfig } = await setupVault()
        vault.name = 'ComplexMergeVault'

        // Test complex nested structures like workspace configurations
        const workspaceConfig = {
          main: {
            id: 'workspace-1',
            type: 'split',
            children: [
              {
                id: 'editor-pane',
                type: 'leaf',
                state: {
                  type: 'markdown',
                  state: {
                    file: 'Notes/Daily/2024-01-01.md',
                    mode: 'source',
                    backlinks: true,
                    source: false,
                  },
                },
              },
            ],
          },
          left: {
            id: 'left-sidebar',
            type: 'split',
            children: [
              {
                id: 'file-explorer',
                type: 'leaf',
                state: { type: 'file-explorer', state: {} },
              },
            ],
            direction: 'vertical',
          },
          active: 'editor-pane',
          lastOpenFiles: [
            'Notes/Daily/2024-01-01.md',
            'Projects/Current/README.md',
          ],
        }

        const tempBaseDir = join(tmpdir(), `ovm-complex-test-${Date.now()}`)
        mkdirSync(tempBaseDir, { recursive: true })
        writeFileSync(
          join(tempBaseDir, 'workspace.json'),
          JSON.stringify(workspaceConfig, null, 2),
        )

        const config = createSyncConfig([
          {
            source: join(tempBaseDir, 'workspace.json'),
            target: 'workspace.json',
            type: 'core',
            vaults: [vault.name],
            mergeStrategy: 'smart',
            include: ['main', 'active'],
            exclude: ['lastOpenFiles'], // Exclude dynamic data
            onlyIfInstalled: false,
          },
        ])

        const flags = getDefaultFlags(vaultConfig.path, vault.path)

        await syncVaultCoreIterator({ vault, config, flags })

        expect(syncProvider.syncFileToVault).toHaveBeenCalledWith(
          expect.objectContaining({
            mergeStrategy: 'smart',
            include: ['main', 'active'],
            exclude: ['lastOpenFiles'],
          }),
        )

        destroyVault(vault.path)
        destroyVault(tempBaseDir)
      })
    })

    it('should install and uninstall a theme by syncing with replaced config', async () => {
      const { vault, config: vaultConfig } = await setupVault()

      const tempSourceDir = join(tmpdir(), `ovm-theme-test-${Date.now()}`)
      mkdirSync(tempSourceDir, { recursive: true })

      const themeFile = join(tempSourceDir, 'themes', 'custom-theme.css')
      mkdirSync(dirname(themeFile), { recursive: true })
      writeFileSync(themeFile, '/* custom theme */')

      const configWithTheme = ConfigSchema.parse({
        plugins: [],
        sync: {
          baseDir: tempSourceDir,
          files: [
            {
              source: 'themes/custom-theme.css',
              target: 'themes/custom-theme.css',
              type: 'core',
              vaults: [vault.name],
              mergeStrategy: 'replace',
              onlyIfInstalled: false,
            },
          ],
        },
      })

      const flags = getDefaultFlags(vaultConfig.path, vault.path)

      // Install theme
      await syncVaultCoreIterator({ vault, config: configWithTheme, flags })

      expect(syncProvider.syncFileToVault).toHaveBeenCalledTimes(1)
      expect(syncProvider.syncFileToVault).toHaveBeenCalledWith(
        expect.objectContaining({
          target: 'themes/custom-theme.css',
          vaultPath: vault.path,
        }),
      )

      // Now, "uninstall" by replacing config with one that doesn't have the theme
      const configWithoutTheme = ConfigSchema.parse({
        plugins: [],
        sync: {
          baseDir: tempSourceDir,
          files: [], // no sync entries
        },
      })

      vi.clearAllMocks()

      // Sync again
      await syncVaultCoreIterator({ vault, config: configWithoutTheme, flags })

      expect(syncProvider.syncFileToVault).toHaveBeenCalledTimes(0)

      // Cleanup
      destroyVault(vault.path)
    })
  })
})
