import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockDirent } from '../utils/testing'
import {
  deduplicatePlugins,
  listInstalledPlugins,
  modifyCommunityPlugins,
  pluginsSelector,
} from './plugins'

vi.mock('fs/promises', () => ({
  access: vi.fn(),
  readdir: vi.fn(),
  readFile: vi.fn(),
  rm: vi.fn(),
  writeFile: vi.fn(),
  constants: {
    R_OK: 4,
    W_OK: 2,
  },
}))

vi.mock('fs', () => ({
  constants: {
    R_OK: 4,
    W_OK: 2,
  },
}))

vi.mock('@inquirer/prompts', () => ({
  checkbox: vi.fn(),
}))

vi.mock('../utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    child: vi.fn(() => ({
      debug: vi.fn(),
    })),
  },
}))

import { checkbox } from '@inquirer/prompts'
import { access, readdir, readFile, writeFile } from 'fs/promises'

describe('Plugins Provider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('listInstalledPlugins', () => {
    it('should return installed plugins from vault', async () => {
      const mockEntries = [
        createMockDirent('plugin1', true),
        createMockDirent('plugin2', true),
        createMockDirent('file.txt', false),
      ]

      vi.mocked(access).mockResolvedValue(undefined)
      vi.mocked(readdir).mockResolvedValue(mockEntries)

      const result = await listInstalledPlugins('/path/to/vault')

      expect(result).toEqual([{ id: 'plugin1' }, { id: 'plugin2' }])
    })

    it('should return empty array when plugins directory does not exist', async () => {
      const error = new Error('ENOENT') as Error & { code: string }
      error.code = 'ENOENT'
      vi.mocked(access).mockRejectedValue(error)

      const result = await listInstalledPlugins('/path/to/vault')

      expect(result).toEqual([])
    })

    it('should throw non-ENOENT errors', async () => {
      const error = new Error('Permission denied') as Error & { code: string }
      error.code = 'EPERM'
      vi.mocked(access).mockRejectedValue(error)

      await expect(listInstalledPlugins('/path/to/vault')).rejects.toThrow(
        'Permission denied',
      )
    })
  })

  describe('pluginsSelector', () => {
    it('should prompt user for plugin selection and sort alphabetically', async () => {
      const mockPlugins = [
        { id: 'plugin-b', name: 'Plugin B' },
        { id: 'plugin-a', name: 'Plugin A' },
      ]

      vi.mocked(checkbox).mockResolvedValue([mockPlugins[0]])

      const result = await pluginsSelector(mockPlugins)

      expect(checkbox).toHaveBeenCalledWith({
        choices: [
          { name: 'plugin-a', value: mockPlugins[1] },
          { name: 'plugin-b', value: mockPlugins[0] },
        ],
        message: 'Select the plugins:',
        validate: expect.any(Function),
        required: true,
      })
      expect(result).toEqual([mockPlugins[0]])
    })

    it('should validate that at least one plugin is selected', async () => {
      const mockPlugins = [
        { id: 'plugin-a', name: 'Plugin A' },
        { id: 'plugin-b', name: 'Plugin B' },
      ]

      vi.mocked(checkbox).mockResolvedValue([mockPlugins[0]])

      await pluginsSelector(mockPlugins)

      // Get the validate function that was passed to checkbox
      const checkboxCall = vi.mocked(checkbox).mock.calls[0][0]
      const validateFn = checkboxCall.validate

      // Test validation with empty selection
      if (validateFn) {
        expect(validateFn([])).toBe('At least one plugin must be selected')

        // Test validation with valid selection
        expect(validateFn([mockPlugins[0]])).not.toBe(
          'At least one plugin must be selected',
        )
      }
    })
  })

  describe('modifyCommunityPlugins', () => {
    const mockPlugin = { id: 'test-plugin', name: 'Test Plugin' }
    const vaultPath = '/path/to/vault'
    const communityPluginsPath = `${vaultPath}/.obsidian/community-plugins.json`

    it('should enable plugin in existing community-plugins.json', async () => {
      const existingPlugins = ['existing-plugin']
      vi.mocked(access).mockResolvedValue(undefined)
      vi.mocked(readFile).mockResolvedValue(
        Buffer.from(JSON.stringify(existingPlugins)),
      )
      vi.mocked(writeFile).mockResolvedValue(undefined)

      const result = await modifyCommunityPlugins(
        mockPlugin,
        vaultPath,
        'enable',
      )

      expect(access).toHaveBeenCalledWith(communityPluginsPath, 2) // W_OK = 2
      expect(readFile).toHaveBeenCalledWith(communityPluginsPath)
      expect(writeFile).toHaveBeenCalledWith(
        communityPluginsPath,
        JSON.stringify(['existing-plugin', 'test-plugin'], null, 2),
      )
      expect(result).toEqual(['existing-plugin', 'test-plugin'])
    })

    it('should disable plugin from existing community-plugins.json', async () => {
      const existingPlugins = ['test-plugin', 'other-plugin']
      vi.mocked(access).mockResolvedValue(undefined)
      vi.mocked(readFile).mockResolvedValue(
        Buffer.from(JSON.stringify(existingPlugins)),
      )
      vi.mocked(writeFile).mockResolvedValue(undefined)

      const result = await modifyCommunityPlugins(
        mockPlugin,
        vaultPath,
        'disable',
      )

      expect(access).toHaveBeenCalledWith(communityPluginsPath, 2)
      expect(readFile).toHaveBeenCalledWith(communityPluginsPath)
      expect(writeFile).toHaveBeenCalledWith(
        communityPluginsPath,
        JSON.stringify(['other-plugin'], null, 2),
      )
      expect(result).toEqual(['other-plugin'])
    })

    it('should create community-plugins.json when file does not exist', async () => {
      const enoentError = new Error('File not found') as Error & {
        code: string
      }
      enoentError.code = 'ENOENT'

      vi.mocked(access).mockRejectedValue(enoentError)
      vi.mocked(writeFile).mockResolvedValue(undefined)

      const result = await modifyCommunityPlugins(
        mockPlugin,
        vaultPath,
        'enable',
      )

      expect(access).toHaveBeenCalledWith(communityPluginsPath, 2)
      expect(writeFile).toHaveBeenCalledWith(
        communityPluginsPath,
        JSON.stringify([]),
      )
      expect(result).toEqual([])
    })

    it('should throw error for non-ENOENT access errors', async () => {
      const permissionError = new Error('Permission denied') as Error & {
        code: string
      }
      permissionError.code = 'EACCES'

      vi.mocked(access).mockRejectedValue(permissionError)

      await expect(
        modifyCommunityPlugins(mockPlugin, vaultPath, 'enable'),
      ).rejects.toThrow('Permission denied')
    })

    it('should enable plugin by default when no action is specified', async () => {
      const existingPlugins = ['existing-plugin']
      vi.mocked(access).mockResolvedValue(undefined)
      vi.mocked(readFile).mockResolvedValue(
        Buffer.from(JSON.stringify(existingPlugins)),
      )
      vi.mocked(writeFile).mockResolvedValue(undefined)

      const result = await modifyCommunityPlugins(mockPlugin, vaultPath)

      expect(writeFile).toHaveBeenCalledWith(
        communityPluginsPath,
        JSON.stringify(['existing-plugin', 'test-plugin'], null, 2),
      )
      expect(result).toEqual(['existing-plugin', 'test-plugin'])
    })
  })

  describe('deduplicatePlugins', () => {
    it('should return original plugins when stage plugin is not in list', () => {
      const existingPlugins = [
        { id: 'plugin1', name: 'Plugin 1' },
        { id: 'plugin2', name: 'Plugin 2' },
      ]
      const newPlugin = { id: 'plugin3', name: 'Plugin 3' }

      const result = deduplicatePlugins(existingPlugins, newPlugin)

      expect(result).toHaveLength(2)
      expect(result).toEqual(existingPlugins)
    })

    it('should remove duplicate plugin from list', () => {
      const existingPlugins = [
        { id: 'plugin1', name: 'Plugin 1' },
        { id: 'plugin2', name: 'Plugin 2' },
      ]
      const duplicatePlugin = { id: 'plugin1', name: 'Plugin 1 Updated' }

      const result = deduplicatePlugins(existingPlugins, duplicatePlugin)

      expect(result).toHaveLength(1)
      expect(result.find((p) => p.id === 'plugin2')?.name).toBe('Plugin 2')
    })
  })
})
