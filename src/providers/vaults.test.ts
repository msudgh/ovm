import { beforeEach, describe, expect, it, vi } from 'vitest'
import { isTestEnv } from '../utils/env'
import {
  findVaultsByPatternMatching,
  getSelectedVaults,
  getVaultName,
  getVaultPath,
  mapVaultsIteratorItem,
  vaultsSelector,
} from './vaults'

vi.mock('glob', () => ({
  glob: vi.fn(),
}))

vi.mock('@inquirer/prompts', () => ({
  checkbox: vi.fn(),
}))

vi.mock('../utils/env', () => ({
  isTestEnv: vi.fn(),
}))

vi.mock('../utils/logger', () => ({
  logger: {
    debug: vi.fn(),
  },
}))

vi.mock('obsidian-utils', () => ({
  findVault: vi.fn(),
}))

import { checkbox } from '@inquirer/prompts'
import { glob } from 'glob'
import { findVault } from 'obsidian-utils'

describe('Vaults Provider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('findVaultsByPatternMatching', () => {
    it('should detect vaults in given path', async () => {
      const mockVaultPaths = [
        '/path/to/vault1/.obsidian',
        '/path/to/vault2/.obsidian',
      ]
      const mockVault = { path: '/path/to/vault1/.obsidian', name: 'vault1' }

      vi.mocked(glob).mockResolvedValue(mockVaultPaths)
      vi.mocked(findVault).mockResolvedValue([mockVault])

      const result = await findVaultsByPatternMatching('/path/to/vaults')

      expect(glob).toHaveBeenCalledWith('/path/to/vaults/**/.obsidian', {
        absolute: true,
        dot: true,
        nocase: true,
      })
      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        ...mockVault,
        name: 'vault1',
        path: '/path/to/vault1',
      })
    })

    it('should handle path that already ends with .obsidian', async () => {
      const mockVaultPaths = ['/path/to/vault/.obsidian']
      const mockVault = { path: '/path/to/vault/.obsidian', name: 'vault' }

      vi.mocked(glob).mockResolvedValue(mockVaultPaths)
      vi.mocked(findVault).mockResolvedValue([mockVault])

      const result = await findVaultsByPatternMatching(
        '/path/to/vault/.obsidian',
      )

      expect(glob).toHaveBeenCalledWith('/path/to/vault/.obsidian', {
        absolute: true,
        dot: true,
        nocase: true,
      })
      expect(result).toHaveLength(1)
    })

    it('should handle empty vault detection', async () => {
      vi.mocked(glob).mockResolvedValue([])

      const result = await findVaultsByPatternMatching('/path/to/empty')

      expect(result).toHaveLength(0)
    })
  })

  describe('vaultsSelector', () => {
    const mockVaults = [
      { name: 'vault-b', path: '/path/to/vault-b' },
      { name: 'vault-a', path: '/path/to/vault-a' },
    ]

    it('should return first vault in test environment', async () => {
      vi.mocked(isTestEnv).mockReturnValue(true)

      const result = await vaultsSelector(mockVaults)

      expect(result).toEqual([mockVaults[1]]) // vault-a comes first after sorting
      expect(checkbox).not.toHaveBeenCalled()
    })

    it('should prompt user for vault selection in non-test environment', async () => {
      vi.mocked(isTestEnv).mockReturnValue(false)
      vi.mocked(checkbox).mockResolvedValue([mockVaults[0]])

      const result = await vaultsSelector(mockVaults)

      expect(checkbox).toHaveBeenCalledWith({
        choices: [
          { name: 'vault-a', value: mockVaults[1] },
          { name: 'vault-b', value: mockVaults[0] },
        ],
        message: 'Select the vaults:',
        validate: expect.any(Function),
        required: true,
      })
      expect(result).toEqual([mockVaults[0]])
    })
  })

  describe('utility functions', () => {
    it('should get vault path', () => {
      const vault = { name: 'test', path: '/path/to/vault' }
      expect(getVaultPath(vault)).toBe('/path/to/vault')
    })

    it('should get vault name', () => {
      const vault = { name: 'test', path: '/path/to/vault' }
      expect(getVaultName(vault)).toBe('test')
    })
  })

  describe('mapVaultsIteratorItem', () => {
    it('should map vaults to iterator items correctly', () => {
      const vaults = [
        { name: 'vault1', path: '/path/to/vault1' },
        { name: 'vault2', path: '/path/to/vault2' },
      ]
      const config = { plugins: [] }
      const flags = { config: '/config/path' }
      const args = { pluginId: 'test-plugin' }

      const result = mapVaultsIteratorItem(vaults, config, flags, args)

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        vault: vaults[0],
        config,
        flags,
        args,
      })
      expect(result[1]).toEqual({
        vault: vaults[1],
        config,
        flags,
        args,
      })
    })

    it('should handle empty vaults array', () => {
      const result = mapVaultsIteratorItem([], { plugins: [] }, {}, {})

      expect(result).toHaveLength(0)
    })
  })

  describe('getSelectedVaults', () => {
    it('should detect and select vaults for given path', async () => {
      vi.mocked(glob).mockResolvedValue(['/path/to/vault/.obsidian'])
      vi.mocked(findVault).mockResolvedValue([
        { path: '/path/to/vault/.obsidian', name: 'vault' },
      ])
      vi.mocked(isTestEnv).mockReturnValue(true)

      const result = await getSelectedVaults('/path/to/vault')

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('vault')
    })
  })
})
