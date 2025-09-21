import { describe, expect, it, vi } from 'vitest'
import { plugin1, plugin2 } from '../../utils/fixtures/plugins'
import {
  destroyVault,
  getTestCommonWithVaultPathFlags,
  setupVault,
} from '../../utils/testing'
import { ConfigSchema } from '../config'
import { statsVaultIterator } from './stats'

vi.mock('obsidian-utils', async () => {
  const actual = await vi.importActual('obsidian-utils')
  return {
    ...actual,
    installPluginFromGithub: vi.fn().mockResolvedValue(undefined),
    isPluginInstalled: vi.fn().mockImplementation((pluginId: string) => {
      // For stats tests, return true only for plugin1 by default
      // Individual tests can override this behavior
      return Promise.resolve(pluginId === 'obsidian-linter')
    }),
  }
})

vi.mock('fs', async () => {
  const actual = await vi.importActual('fs')
  return {
    ...actual,
    existsSync: vi.fn().mockReturnValue(true),
  }
})

vi.mock('fs/promises', async () => {
  const actual = (await vi.importActual(
    'fs/promises',
  )) as typeof import('fs/promises')
  return {
    ...actual,
    readFile: vi.fn().mockImplementation((path) => {
      // Mock manifest.json content
      if (path.includes('manifest.json')) {
        return Promise.resolve('{"version": "1.0.0"}')
      }
      return actual.readFile(path)
    }),
  }
})

vi.mock('../../utils/fs', () => ({
  getFileSize: vi.fn().mockResolvedValue(1024n), // Mock 1KB folder size as bigint
}))

describe('Command: stats', () => {
  it('should display stats for vaults and 0 plugins', async () => {
    const { vault, config } = await setupVault(
      ConfigSchema.parse({ plugins: [] }),
    )
    const installedPlugins = {}
    const result = await statsVaultIterator({
      vault,
      config: ConfigSchema.parse({ plugins: [] }),
      flags: getTestCommonWithVaultPathFlags(config.path, vault.path),
    })

    expect(result.installedPlugins).to.be.equal(0)
    expect(Object.keys(installedPlugins).length).to.be.equal(0)

    destroyVault(vault.path)
  })

  it('should display stats for vaults and 1 plugin', async () => {
    const { vault, config } = await setupVault(
      ConfigSchema.parse({ plugins: [] }),
    )
    const installedPlugins = {}
    const result = await statsVaultIterator({
      vault,
      config: ConfigSchema.parse({ plugins: [plugin1] }),
      flags: getTestCommonWithVaultPathFlags(config.path, vault.path),
    })

    expect(result.installedPlugins).to.be.equal(1)

    for (const key in installedPlugins) {
      expect(key).to.match(new RegExp(`${plugin1.id}@${plugin1.version}`))
    }

    destroyVault(vault.path)
  })

  it('should not display stats for a plugin dir which does not exist', async () => {
    const { vault, config } = await setupVault(
      ConfigSchema.parse({ plugins: [] }),
    )
    const testCommonWithVaultPathFlags = getTestCommonWithVaultPathFlags(
      config.path,
      vault.path,
    )

    // Skip the install step since we're mocking isPluginInstalled to return true
    // This test is about stats counting, not about installation

    const result = await statsVaultIterator({
      vault,
      config: ConfigSchema.parse({ plugins: [plugin1, plugin2] }),
      flags: testCommonWithVaultPathFlags,
    })

    expect(result.installedPlugins).to.be.equal(1)
    expect(result.configuredPlugins).to.be.equal(2)

    destroyVault(vault.path)
  })
})
