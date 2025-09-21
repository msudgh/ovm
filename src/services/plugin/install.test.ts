import * as obsidianUtils from 'obsidian-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as githubProvider from '../../providers/registry'
import { plugin5 } from '../../utils/fixtures/plugins'
import {
  destroyVault,
  getTestCommonWithVaultPathFlags,
  setupVault,
} from '../../utils/testing'
import { ConfigSchema } from '../config'
import { Config } from '../config/index.types'
import { installVaultIterator } from './install'

vi.mock('obsidian-utils', async () => {
  const actual = await vi.importActual('obsidian-utils')
  return {
    ...actual,
    installPluginFromGithub: vi.fn().mockResolvedValue(undefined),
    isPluginInstalled: vi.fn().mockResolvedValue(false),
  }
})

vi.mock('../../providers/registry', async () => {
  const actual = await vi.importActual('../../providers/registry')
  return {
    ...actual,
    findPluginInRegistry: vi.fn(),
    handleExceedRateLimitError: vi.fn(),
  }
})

describe('Command: install', () => {
  let testVault: {
    vault: {
      name: string
      path: string
    }
    config: Config & {
      path: string
    }
  }

  beforeEach(async () => {
    testVault = await setupVault()

    // Set default mocks for github provider
    vi.mocked(githubProvider.findPluginInRegistry).mockResolvedValue({
      id: plugin5.id,
      name: 'Obsidian Git',
      author: 'denolehov',
      description:
        'Backup your Obsidian.md vault with git. You can commit, push, pull, and view git log.',
      repo: plugin5.repo as string,
    })
    vi.mocked(obsidianUtils.installPluginFromGithub).mockResolvedValue(
      undefined,
    )
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    if (testVault) {
      destroyVault(testVault.vault.path)
    }
  })

  it('should perform installation successfully', async () => {
    const { vault, config } = await setupVault(
      ConfigSchema.parse({ plugins: [plugin5] }),
    )
    const testCommonWithVaultPathFlags = getTestCommonWithVaultPathFlags(
      config.path,
      vault.path,
    )

    const result = await installVaultIterator({
      vault,
      config,
      flags: {
        ...testCommonWithVaultPathFlags,
        enable: true,
      },
      args: { pluginId: plugin5.id },
    })

    expect(result.installedPlugins[0].id).to.be.equal(config?.plugins[0].id)
    expect(result.failedPlugins.length).to.equal(0)
    expect(result.reinstallPlugins.length).to.equal(0)

    destroyVault(vault.path)
  })

  it('should throw PluginNotFoundInRegistryError when plugin is not found based on testing installVaultIterator', async () => {
    const pluginId = 'nonExistentPluginId'
    const { vault, config } = await setupVault(
      ConfigSchema.parse({ plugins: [{ id: pluginId }] }),
    )
    const testCommonWithVaultPathFlags = getTestCommonWithVaultPathFlags(
      config.path,
      vault.path,
    )

    vi.mocked(githubProvider.findPluginInRegistry).mockResolvedValue(undefined)

    const result = await installVaultIterator({
      vault,
      config,
      flags: {
        ...testCommonWithVaultPathFlags,
        enable: true,
      },
      args: { pluginId },
    })

    expect(result.installedPlugins.length).to.equal(0)
    expect(result.failedPlugins.length).to.equal(1)
    expect(result.failedPlugins[0].id).to.equal(pluginId)
    expect(result.failedPlugins[0].error.name).to.equal(
      'PluginNotFoundInRegistryError',
    )

    destroyVault(vault.path)
  })

  it('should not install plugin if it is already installed', async () => {
    const { vault, config } = await setupVault(
      ConfigSchema.parse({ plugins: [plugin5] }),
    )
    const testCommonWithVaultPathFlags = getTestCommonWithVaultPathFlags(
      config.path,
      vault.path,
    )

    const result = await installVaultIterator({
      vault,
      config,
      flags: {
        ...testCommonWithVaultPathFlags,
        enable: true,
      },
    })

    expect(result.installedPlugins.length).to.equal(1)
    expect(result.failedPlugins.length).to.equal(0)
    expect(result.reinstallPlugins.length).to.equal(0)

    vi.mocked(obsidianUtils.isPluginInstalled).mockResolvedValue(true)

    const resultSecondAttempt = await installVaultIterator({
      vault,
      config,
      flags: {
        ...testCommonWithVaultPathFlags,
        enable: true,
      },
    })

    expect(resultSecondAttempt.installedPlugins.length).to.equal(0)
    expect(resultSecondAttempt.failedPlugins.length).to.equal(0)
    expect(resultSecondAttempt.reinstallPlugins.length).to.equal(1)
    expect(resultSecondAttempt.reinstallPlugins[0].id).to.equal(plugin5.id)

    destroyVault(vault.path)
  })

  it('should handle API rate limit error', async () => {
    const { vault, config } = await setupVault(
      ConfigSchema.parse({ plugins: [plugin5] }),
    )
    const testCommonWithVaultPathFlags = getTestCommonWithVaultPathFlags(
      config.path,
      vault.path,
    )

    // Mock the installPluginFromGithub function to reject with rate limit error
    vi.mocked(obsidianUtils.installPluginFromGithub).mockRejectedValue(
      new Error('API rate limit exceeded'),
    )

    try {
      await installVaultIterator({
        vault,
        config,
        flags: {
          ...testCommonWithVaultPathFlags,
          enable: true,
        },
        args: { pluginId: plugin5.id },
      })
    } catch (error) {
      expect((error as Error).message).to.match(/API rate limit exceeded/)
    }

    destroyVault(vault.path)
  })

  it('should not handle any error as rate limit error', async () => {
    const { vault, config } = await setupVault(
      ConfigSchema.parse({ plugins: [plugin5] }),
    )
    const testCommonWithVaultPathFlags = getTestCommonWithVaultPathFlags(
      config.path,
      vault.path,
    )

    // Mock findPluginInRegistry to reject with a generic error
    vi.mocked(githubProvider.findPluginInRegistry).mockRejectedValue(
      new Error('Some error'),
    )

    const result = await installVaultIterator({
      vault,
      config,
      flags: {
        ...testCommonWithVaultPathFlags,
        enable: true,
      },
      args: { pluginId: plugin5.id },
    })

    expect(result.installedPlugins.length).to.equal(0)
    expect(result.failedPlugins.length).to.equal(1)
    expect(result.failedPlugins.some((plugin) => plugin.id === plugin5.id)).to
      .be.true

    destroyVault(vault.path)
  })
})
