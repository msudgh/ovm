import { Vault } from 'obsidian-utils'
import { describe, expect, it } from 'vitest'
import {
  Config,
  ConfigSyncEntry,
  ConfigSyncType,
} from '../services/config/index.types'
import { getFilteredSyncEntries } from './config'

describe('Config utilities', () => {
  describe('getFilteredSyncEntries', () => {
    const mockVault: Vault = {
      name: 'test-vault',
      path: '/path/to/test-vault',
    }

    const mockConfigSyncEntries: ConfigSyncEntry[] = [
      {
        type: 'core' as ConfigSyncType,
        source: 'source1.json',
        target: 'dest1.json',
        mergeStrategy: 'replace',
        onlyIfInstalled: false,
      },
      {
        type: 'plugin' as ConfigSyncType,
        source: 'source2.json',
        target: 'dest2.json',
        mergeStrategy: 'replace',
        onlyIfInstalled: true,
        pluginId: 'plugin-1',
      },
      {
        type: 'plugin' as ConfigSyncType,
        source: 'source3.json',
        target: 'dest3.json',
        mergeStrategy: 'replace',
        onlyIfInstalled: true,
        pluginId: 'plugin-2',
      },
      {
        type: 'custom' as ConfigSyncType,
        source: 'source4.json',
        target: 'dest4.json',
        mergeStrategy: 'replace',
        onlyIfInstalled: false,
        vaults: ['test-vault', 'other-vault'],
      },
      {
        type: 'custom' as ConfigSyncType,
        source: 'source5.json',
        target: 'dest5.json',
        mergeStrategy: 'replace',
        onlyIfInstalled: false,
        vaults: ['other-vault'],
      },
      {
        type: 'core' as ConfigSyncType,
        source: 'source6.json',
        target: 'dest6.json',
        mergeStrategy: 'replace',
        onlyIfInstalled: false,
        vaults: ['test-vault'],
      },
    ]

    const mockConfig: Config = {
      plugins: [],
      configSync: {
        files: mockConfigSyncEntries,
      },
    }

    it('should filter entries by type', () => {
      const result = getFilteredSyncEntries({
        config: mockConfig,
        vault: mockVault,
        types: ['core'],
      })

      expect(result).toHaveLength(2)
      expect(result.every((entry) => entry.type === 'core')).toBe(true)
    })

    it('should filter entries by multiple types', () => {
      const result = getFilteredSyncEntries({
        config: mockConfig,
        vault: mockVault,
        types: ['core', 'plugin'],
      })

      expect(result).toHaveLength(4)
      expect(
        result.every((entry) =>
          ['core', 'plugin'].includes(entry.type as ConfigSyncType),
        ),
      ).toBe(true)
    })

    it('should filter entries by pluginId when provided', () => {
      const result = getFilteredSyncEntries({
        config: mockConfig,
        vault: mockVault,
        types: ['plugin'],
        pluginId: 'plugin-1',
      })

      expect(result).toHaveLength(1)
      expect(result[0].pluginId).toBe('plugin-1')
    })

    it('should filter entries by vault when vaults array is specified', () => {
      const result = getFilteredSyncEntries({
        config: mockConfig,
        vault: mockVault,
        types: ['custom'],
      })

      // Should only return entries that either have no vaults array or include 'test-vault'
      expect(result).toHaveLength(1)
      expect(result[0].vaults).toContain('test-vault')
    })

    it('should return all matching entries when no vault restriction exists', () => {
      const configWithoutVaultRestrictions: Config = {
        plugins: [],
        configSync: {
          files: [
            {
              type: 'core' as ConfigSyncType,
              source: 'source1.json',
              target: 'dest1.json',
              mergeStrategy: 'replace',
              onlyIfInstalled: false,
            },
            {
              type: 'core' as ConfigSyncType,
              source: 'source2.json',
              target: 'dest2.json',
              mergeStrategy: 'replace',
              onlyIfInstalled: false,
            },
          ],
        },
      }

      const result = getFilteredSyncEntries({
        config: configWithoutVaultRestrictions,
        vault: mockVault,
        types: ['core'],
      })

      expect(result).toHaveLength(2)
    })

    it('should return empty array when no entries match the type filter', () => {
      const result = getFilteredSyncEntries({
        config: mockConfig,
        vault: mockVault,
        types: ['nonexistent' as ConfigSyncType],
      })

      expect(result).toHaveLength(0)
    })

    it('should return empty array when config has no configSync', () => {
      const configWithoutSync: Config = {
        plugins: [],
      }

      const result = getFilteredSyncEntries({
        config: configWithoutSync,
        vault: mockVault,
        types: ['core'],
      })

      expect(result).toHaveLength(0)
    })

    it('should return empty array when configSync has no files', () => {
      const configWithEmptySync: Config = {
        plugins: [],
        configSync: {
          files: [],
        },
      }

      const result = getFilteredSyncEntries({
        config: configWithEmptySync,
        vault: mockVault,
        types: ['core'],
      })

      expect(result).toHaveLength(0)
    })

    it('should combine all filters correctly', () => {
      const result = getFilteredSyncEntries({
        config: mockConfig,
        vault: mockVault,
        types: ['plugin'],
        pluginId: 'plugin-2',
      })

      expect(result).toHaveLength(1)
      expect(result[0].type).toBe('plugin')
      expect(result[0].pluginId).toBe('plugin-2')
    })
  })
})
