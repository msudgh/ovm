import NodeFetchCache, { FileSystemCache } from 'node-fetch-cache'

// const interceptor = new ClientRequestInterceptor()
const fetch = NodeFetchCache.create({
  cache: new FileSystemCache({
    cacheDirectory: './cache',
    ttl: 3600,
  }),
  calculateCacheKey: (url, options) => {
    return JSON.stringify([options?.method, url])
  },
  shouldCacheResponse: (response) => response.ok,
})

export const handleExceedRateLimitError = (error: unknown) => {
  if (
    error instanceof Error &&
    'message' in error &&
    error.message.search('find') !== -1
  ) {
    const apiRateLimitMessage =
      'API rate limit exceeded, Try again later. Check out Github documentation for rate limit.'
    throw new Error(apiRateLimitMessage)
  }
}

export interface PluginRegistry {
  id: string
  name: string
  author: string
  description: string
  repo: string
}

export const fetchPlugins = async (): Promise<PluginRegistry[]> => {
  const url =
    'https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-plugins.json'
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Failed to fetch plugins')
  }
  return response.json()
}

export const findPluginInRegistry = async (
  name: string,
): Promise<PluginRegistry | undefined> => {
  const pluginsRegistry = await fetchPlugins()
  return pluginsRegistry.find(({ id }) => id === name)
}
