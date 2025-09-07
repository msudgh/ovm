import * as obsidianUtils from 'obsidian-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as pluginsProvider from '../../providers/plugins'
import { UninstallCommandIterator } from '../../types/commands'
import { plugin1, plugin2 } from '../../utils/fixtures/plugins'
import {
  destroyVault,
  getTestCommonWithVaultPathFlags,
  setupVault,
} from '../../utils/testing'
import { ConfigSchema } from '../config'
import { uninstallVaultIterator } from './uninstall'

vi.mock('obsidian-utils', async () => {
  const actual = await vi.importActual('obsidian-utils')
  return {
    ...actual,
    installPluginFromGithub: vi.fn().mockResolvedValue(undefined),
    isPluginInstalled: vi.fn().mockResolvedValue(true), // Return true to simulate plugins are installed
  }
})

const [{ id: plugin1Id }, { id: plugin2Id }] = [plugin1, plugin2]

describe('Command: uninstall', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should perform uninstallation successfully', async () => {
    const { config, vault } = await setupVault(
      ConfigSchema.parse({ plugins: [plugin1] }),
    )
    const testCommonWithVaultPathFlags = getTestCommonWithVaultPathFlags(
      config.path,
      vault.path,
    )

    const plugins = [{ id: plugin1Id }]

    // Mock removePluginDir to succeed
    const removePluginDirSpy = vi
      .spyOn(pluginsProvider, 'removePluginDir')
      .mockResolvedValue()

    // For uninstall tests, we want isPluginInstalled to return true initially
    vi.mocked(obsidianUtils.isPluginInstalled).mockResolvedValue(true)

    const result = await (uninstallVaultIterator as UninstallCommandIterator)({
      vault,
      config: {
        ...config,
        plugins,
      },
      flags: {
        ...testCommonWithVaultPathFlags,
      },
    })

    expect(result.uninstalledPlugins.some(({ id }) => id === plugin1Id)).to.be
      .true
    expect(result.failedPlugins.length).to.equal(0)

    removePluginDirSpy.mockRestore()
    destroyVault(vault.path)
  })

  it('should fail when plugin not found', async () => {
    const pluginId = 'nonExistentPluginId'

    const { vault, config } = await setupVault(
      ConfigSchema.parse({ plugins: [{ id: pluginId }] }),
    )

    const result = await (uninstallVaultIterator as UninstallCommandIterator)({
      vault,
      config,
      flags: getTestCommonWithVaultPathFlags(config.path, vault.path),
    })

    expect(result.uninstalledPlugins.length).to.equal(0)
    expect(result.failedPlugins.some(({ id }) => id === pluginId)).to.be.true

    destroyVault(vault.path)
  })

  it('should uninstall only the specified plugin', async () => {
    const plugins = [plugin1, plugin2]
    const { config, vault } = await setupVault(ConfigSchema.parse({ plugins }))

    const testCommonWithVaultPathFlags = getTestCommonWithVaultPathFlags(
      config.path,
      vault.path,
    )

    vi.mocked(obsidianUtils.isPluginInstalled).mockResolvedValue(true)

    const result = await (uninstallVaultIterator as UninstallCommandIterator)({
      vault,
      config,
      flags: {
        ...testCommonWithVaultPathFlags,
      },
      args: { pluginId: plugin1Id },
    })

    expect(result.uninstalledPlugins.length).to.equal(1)
    expect(result.uninstalledPlugins.some(({ id }) => id === plugin1Id)).to.be
      .true
    expect(result.failedPlugins.length).to.equal(0)

    destroyVault(vault.path)
  })

  it('should count failed plugins when process encounter unhandled issue', async () => {
    const { vault, config } = await setupVault(
      ConfigSchema.parse({ plugins: [plugin1, plugin2] }),
    )
    const testCommonWithVaultPathFlags = getTestCommonWithVaultPathFlags(
      config.path,
      vault.path,
    )

    // Mock that plugins are installed
    vi.mocked(obsidianUtils.isPluginInstalled).mockResolvedValue(true)

    const removePluginDirSpy = vi
      .spyOn(pluginsProvider, 'removePluginDir')
      .mockRejectedValue(new Error('Error'))

    const result = await uninstallVaultIterator({
      vault,
      config,
      flags: {
        ...testCommonWithVaultPathFlags,
      },
    })

    expect(removePluginDirSpy.mock.calls.length).to.be.greaterThan(0)
    expect(result.uninstalledPlugins.length).to.equal(0)
    expect(result.failedPlugins.length).to.equal(2)
    expect(result.failedPlugins.some((plugin) => plugin.id === plugin1Id)).to.be
      .true
    expect(result.failedPlugins.some((plugin) => plugin.id === plugin2Id)).to.be
      .true

    removePluginDirSpy.mockRestore()
    destroyVault(vault.path)
  })
})
