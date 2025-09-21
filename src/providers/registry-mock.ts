import { PluginRegistry } from './registry.types'

// Mock plugin registry data for testing to reduce API calls
export const mockPluginRegistry: PluginRegistry[] = [
  {
    id: 'obsidian-linter',
    name: 'Linter',
    author: 'Victor Tao',
    description:
      'Formats and styles your notes with a focus on configurability and extensibility.',
    repo: 'platers/obsidian-linter',
  },
  {
    id: 'colored-tags',
    name: 'Colored Tags',
    author: 'Pavel Frankov',
    description: 'Adds colors to tags',
    repo: 'pfrankov/obsidian-colored-tags',
  },
  {
    id: 'nldates-obsidian',
    name: 'Natural Language Dates',
    author: 'Argentina Ortega Sainz',
    description: 'Create date-links based on natural language.',
    repo: 'argenos/nldates-obsidian',
  },
  {
    id: 'hotkeysplus-obsidian',
    name: 'Hotkeys++',
    author: 'Argentina Ortega Sainz',
    description: 'Additional hotkeys to do common things in Obsidian',
    repo: 'argenos/hotkeysplus-obsidian',
  },
  {
    id: 'obsidian-git',
    name: 'Obsidian Git',
    author: 'Denis Olehov',
    description: 'Backup your vault with git',
    repo: 'Vinzent03/obsidian-git',
  },
]

// Mock implementation of findPluginInRegistry for testing
export const findPluginInRegistryMock = async (
  name: string,
): Promise<PluginRegistry | undefined> => {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 10))
  return mockPluginRegistry.find(({ id }) => id === name)
}

// Mock implementation of fetchPlugins for testing
export const fetchPluginsMock = async (): Promise<PluginRegistry[]> => {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 50))
  return mockPluginRegistry
}
