import NodeFetchCache, { FileSystemCache } from 'node-fetch-cache'
import { platform, tmpdir } from 'os'
import { isTestEnv } from '../utils/env'
import { PluginRegistry } from './registry.types'

const isProduction = !isTestEnv
const cacheSubdir = isProduction ? 'obsidian-utils' : 'obsidian-utils-test'

// 1 hour for production, 24 hours for tests
const cacheTTL = isProduction ? 3600 : 86400

const cacheDirectory =
  platform() === 'win32'
    ? `${tmpdir()}\\.cache\\${cacheSubdir}`
    : `${tmpdir()}/.cache/${cacheSubdir}`

const fetch = NodeFetchCache.create({
  cache: new FileSystemCache({
    cacheDirectory,
    ttl: cacheTTL,
  }),
  calculateCacheKey: async (url, options) => {
    return JSON.stringify([options?.method, url])
  },
  shouldCacheResponse: (response) => response.ok,
})

// Enhanced rate limit error detection and handling
export const handleExceedRateLimitError = (error: unknown) => {
  if (error instanceof Error) {
    const errorMessage = error.message.toLowerCase()
    const isRateLimitError =
      errorMessage.includes('rate limit') ||
      errorMessage.includes('api rate limit exceeded') ||
      errorMessage.includes('403') ||
      (errorMessage.includes('find') && errorMessage.includes('github'))

    if (isRateLimitError) {
      const apiRateLimitMessage =
        'API rate limit exceeded, Try again later. Check out Github documentation for rate limit.'
      throw new Error(apiRateLimitMessage)
    }
  }
}

// Add retry mechanism for API calls
const retryFetch = async (url: string, retries = 3, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url)
      if (response.ok) {
        return response
      }

      // If it's a rate limit error (429 or 403), wait and retry
      if (response.status === 429 || response.status === 403) {
        if (i < retries - 1) {
          await new Promise((resolve) =>
            global.setTimeout(resolve, delay * Math.pow(2, i)),
          )
          continue
        }
      }

      return response
    } catch (error) {
      if (i === retries - 1) {
        throw error
      }
      await new Promise((resolve) =>
        global.setTimeout(resolve, delay * Math.pow(2, i)),
      )
    }
  }

  throw new Error('Max retries reached')
}

export const fetchPlugins = async (): Promise<PluginRegistry[]> => {
  // Use mock data in test environment to avoid rate limits
  if (!isProduction) {
    const { fetchPluginsMock } = await import('./registry-mock')
    return fetchPluginsMock()
  }

  const url =
    'https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-plugins.json'

  try {
    const response = await retryFetch(url)
    if (!response.ok) {
      throw new Error(
        `Failed to fetch plugins: ${response.status} ${response.statusText}`,
      )
    }
    return response.json() as unknown as PluginRegistry[]
  } catch (error) {
    handleExceedRateLimitError(error)
    throw error
  }
}

export const findPluginInRegistry = async (
  name: string,
): Promise<PluginRegistry | undefined> => {
  // Use mock data in test environment to avoid rate limits
  if (!isProduction) {
    const { findPluginInRegistryMock } = await import('./registry-mock')
    return findPluginInRegistryMock(name)
  }

  const pluginsRegistry = await fetchPlugins()
  return pluginsRegistry.find(({ id }) => id === name)
}
