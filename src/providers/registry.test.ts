import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  fetchPlugins,
  findPluginInRegistry,
  handleExceedRateLimitError,
} from './registry'

describe('GitHub Provider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('handleExceedRateLimitError', () => {
    it('should detect rate limit errors with "rate limit" message', () => {
      const error = new Error('API rate limit exceeded')

      expect(() => handleExceedRateLimitError(error)).toThrow(
        'API rate limit exceeded, Try again later. Check out Github documentation for rate limit.',
      )
    })

    it('should detect rate limit errors with 403 status', () => {
      const error = new Error('Request failed with status 403')

      expect(() => handleExceedRateLimitError(error)).toThrow(
        'API rate limit exceeded, Try again later. Check out Github documentation for rate limit.',
      )
    })

    it('should detect rate limit errors with github find pattern', () => {
      const error = new Error('Cannot find github repository')

      expect(() => handleExceedRateLimitError(error)).toThrow(
        'API rate limit exceeded, Try again later. Check out Github documentation for rate limit.',
      )
    })

    it('should not throw for non-rate-limit errors', () => {
      const error = new Error('Some other error')

      expect(() => handleExceedRateLimitError(error)).not.toThrow()
    })

    it('should handle non-Error objects', () => {
      const error = 'string error'

      expect(() => handleExceedRateLimitError(error)).not.toThrow()
    })
  })

  describe('Integration tests using mocks (test environment)', () => {
    describe('fetchPlugins', () => {
      it('should fetch plugins registry successfully using mock data', async () => {
        const result = await fetchPlugins()

        // Verify we get the mock data structure
        expect(Array.isArray(result)).toBe(true)
        expect(result.length).toBeGreaterThan(0)

        // Verify the structure of returned plugins
        const plugin = result[0]
        expect(plugin).toHaveProperty('id')
        expect(plugin).toHaveProperty('name')
        expect(plugin).toHaveProperty('author')
        expect(plugin).toHaveProperty('repo')

        // Verify some known mock data
        expect(result.some((p) => p.id === 'obsidian-linter')).toBe(true)
        expect(result.some((p) => p.id === 'colored-tags')).toBe(true)
      })
    })

    describe('findPluginInRegistry', () => {
      it('should find plugin by ID successfully using mock data', async () => {
        const result = await findPluginInRegistry('obsidian-linter')

        expect(result).toBeDefined()
        expect(result?.id).toBe('obsidian-linter')
        expect(result?.name).toBe('Linter')
        expect(result?.author).toBe('Victor Tao')
        expect(result?.repo).toBe('platers/obsidian-linter')
      })

      it('should return undefined when plugin not found in mock data', async () => {
        const result = await findPluginInRegistry('non-existent-plugin')

        expect(result).toBeUndefined()
      })

      it('should find different plugins correctly', async () => {
        const coloredTags = await findPluginInRegistry('colored-tags')
        const obsidianGit = await findPluginInRegistry('obsidian-git')

        expect(coloredTags?.name).toBe('Colored Tags')
        expect(obsidianGit?.name).toBe('Obsidian Git')
      })
    })
  })
})
