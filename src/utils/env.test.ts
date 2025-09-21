import { describe, expect, it } from 'vitest'
import { isTestEnv } from './env'

describe('Environment Variables', () => {
  it('returns true if current environment is test or CI', () => {
    const result = isTestEnv()
    expect(result).toBe(true)
  })
})
