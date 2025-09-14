import { mkdirSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as syncProvider from './providers/sync'
import { ConfigSchema } from './services/config'
import { syncPluginVaultIterator } from './services/plugin/pluginSync'
import { syncVaultCoreIterator } from './services/vault/vaultSync'
import {
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
  })
})
