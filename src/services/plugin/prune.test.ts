import { beforeEach, describe, expect, it, vi } from 'vitest'
import { plugin3, plugin4 } from '../../utils/fixtures/plugins'

// Track installed plugins across test operations
const installedPluginIds = new Set<string>()

vi.mock('obsidian-utils', async () => {
  const actual = await vi.importActual('obsidian-utils')
  return {
    ...actual,
    installPluginFromGithub: vi.fn().mockImplementation((pluginId: string) => {
      installedPluginIds.add(pluginId)
      return Promise.resolve(undefined)
    }),
    isPluginInstalled: vi.fn().mockImplementation((pluginId: string) => {
      return Promise.resolve(installedPluginIds.has(pluginId))
    }),
  }
})

// Mock plugins provider to track installed plugins
vi.mock('../../providers/plugins', async () => {
  const actual = await vi.importActual('../../providers/plugins')
  return {
    ...actual,
    listInstalledPlugins: vi.fn().mockImplementation(() => {
      return Promise.resolve(
        Array.from(installedPluginIds).map((id) => ({ id })),
      )
    }),
    removePluginDir: vi.fn().mockImplementation((pluginId: string) => {
      installedPluginIds.delete(pluginId)
      return Promise.resolve()
    }),
  }
})

vi.mock('../../providers/registry', async () => {
  const actual = await vi.importActual('../../providers/registry')
  return {
    ...actual,
    findPluginInRegistry: vi.fn().mockImplementation((pluginId: string) => {
      // Return mock registry data for test plugins
      const mockRegistry: Record<
        string,
        {
          id: string
          name: string
          author: string
          description: string
          repo: string
        }
      > = {
        'nldates-obsidian': {
          id: 'nldates-obsidian',
          name: 'Natural Language Dates',
          author: 'Argentina Ortega Sainz',
          description: 'Create date-links based on natural language.',
          repo: 'argenos/nldates-obsidian',
        },
        'hotkeysplus-obsidian': {
          id: 'hotkeysplus-obsidian',
          name: 'Hotkeys++',
          author: 'Argentina Ortega Sainz',
          description: 'Additional hotkeys to do common things in Obsidian',
          repo: 'argenos/hotkeysplus-obsidian',
        },
      }
      return Promise.resolve(mockRegistry[pluginId])
    }),
    handleExceedRateLimitError: vi.fn(),
  }
})

import {
  destroyVault,
  getTestCommonWithVaultPathFlags,
  setupVault,
} from '../../utils/testing'
import { ConfigSchema } from '../config'
import { installVaultIterator } from './install'
import { pruneVaultIterator } from './prune'

const [{ id: plugin3Id }] = [plugin3, plugin4]

describe('Command: prune', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset the installed plugins tracker
    installedPluginIds.clear()
  })

  it('should prune plugins successfully', async () => {
    // Import after mocks are set up
    const { modifyCommunityPlugins } = await import('../../providers/plugins')

    const { vault, config } = await setupVault(
      ConfigSchema.parse({ plugins: [plugin3, plugin4] }),
    )
    const testCommonWithVaultPathFlags = getTestCommonWithVaultPathFlags(
      config.path,
      vault.path,
    )

    // Manually add plugins to tracking set to simulate installation
    installedPluginIds.add(plugin3Id)
    installedPluginIds.add(plugin4.id)

    const installResult = await installVaultIterator({
      vault,
      config: {
        ...config,
        plugins: [plugin3, plugin4],
      },
      flags: {
        ...testCommonWithVaultPathFlags,
        enable: true,
      },
    })

    // Check that plugins were processed
    const totalProcessedPlugins =
      installResult.installedPlugins.length +
      installResult.reinstallPlugins.length +
      installResult.failedPlugins.length
    expect(totalProcessedPlugins).to.be.equal(2)

    // Most likely the plugins are marked as "already installed" due to mocking
    // In either case, the test should continue to verify pruning functionality
    expect(installResult.failedPlugins.length).to.be.equal(0)

    await modifyCommunityPlugins({ id: plugin3Id }, vault.path, 'disable')

    const { prunedPlugins } = await pruneVaultIterator({
      vault,
      config: {
        ...config,
        plugins: [plugin4],
      },
      flags: {
        ...testCommonWithVaultPathFlags,
      },
    })

    expect(prunedPlugins).to.have.lengthOf(1)
    expect(prunedPlugins?.some(({ id }) => plugin3Id === id)).to.be.true
    destroyVault(vault.path)
  })

  it('should prune only if plugins directory exists', async () => {
    const { vault, config } = await setupVault(
      ConfigSchema.parse({ plugins: [plugin3] }),
    )
    const testCommonWithVaultPathFlags = getTestCommonWithVaultPathFlags(
      config.path,
      vault.path,
    )

    const result = await pruneVaultIterator({
      vault,
      config: {
        ...config,
        plugins: [plugin3],
      },
      flags: {
        ...testCommonWithVaultPathFlags,
        path: vault.path,
        name: vault.name,
      },
    })

    expect(result.prunedPlugins).to.have.lengthOf(0)
    destroyVault(vault.path)
  })
})
