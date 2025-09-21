import { describe, expect, it } from 'vitest'
import { getPluginVersion } from './plugin'

describe('getPluginVersion', () => {
  it('should return plugin version when provided', () => {
    const plugin = {
      id: 'test-plugin',
      version: '1.2.0' as const,
    }

    const result = getPluginVersion(plugin)

    expect(result).toBe('1.2.0')
  })

  it('should return "latest" when no plugin provided', () => {
    const result = getPluginVersion()

    expect(result).toBe('latest')
  })

  it('should return "latest" when plugin has no version', () => {
    const plugin = {
      id: 'test-plugin',
    }

    const result = getPluginVersion(plugin)

    expect(result).toBe('latest')
  })
})
