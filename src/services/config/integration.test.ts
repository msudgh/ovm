import { mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ConfigSchema } from '.'
import * as configSyncProvider from '../../providers/configSync'
import {
  destroyVault,
  getTestCommonWithVaultPathFlags,
  setupVault,
} from '../../utils/testing'
import { syncPluginVaultIterator } from '../plugin/pluginSync'
import { syncVaultCoreIterator } from '../vault/vaultSync'

vi.mock('../../providers/configSync', async () => {
  const actual = await vi.importActual('../../providers/configSync')
  return {
    ...actual,
    syncFileToVault: vi.fn(),
    syncPluginConfigToVault: vi.fn(),
  }
})

describe('Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(configSyncProvider.syncFileToVault).mockResolvedValue(true)
    vi.mocked(configSyncProvider.syncPluginConfigToVault).mockResolvedValue(
      true,
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should correctly orchestrate core and plugin sync across multiple vaults', async () => {
    // Setup: Create two vaults, "Work" and "Personal"
    const { vault: workVault, config: workConfig } = await setupVault()
    workVault.name = 'Work'
    const { vault: personalVault, config: personalConfig } = await setupVault()
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
      configSync: {
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
    await syncVaultCoreIterator({ vault: workVault, config, flags: workFlags })
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
    expect(configSyncProvider.syncFileToVault).toHaveBeenCalledWith(
      expect.objectContaining({
        vaultPath: workVault.path,
        target: 'app.json',
      }),
    )
    expect(configSyncProvider.syncPluginConfigToVault).not.toHaveBeenCalledWith(
      expect.objectContaining({
        vaultPath: workVault.path,
      }),
    )

    // Assertions for "Personal" vault
    expect(configSyncProvider.syncFileToVault).not.toHaveBeenCalledWith(
      expect.objectContaining({
        vaultPath: personalVault.path,
      }),
    )
    expect(configSyncProvider.syncPluginConfigToVault).toHaveBeenCalledWith(
      expect.objectContaining({
        vaultPath: personalVault.path,
        pluginId: 'test-plugin',
      }),
    )

    // Cleanup
    destroyVault(workVault.path)
    destroyVault(personalVault.path)
  })
})
