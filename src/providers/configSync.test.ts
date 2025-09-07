import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { destroyVault, setupVault } from '../utils/testing'
import { syncFileToVault, syncPluginConfigToVault } from './configSync'

describe('ConfigSync Provider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('syncFileToVault', () => {
    const testVaultSetup = async () => {
      const { vault, config } = await setupVault()
      return { vault, config }
    }

    it('should sync CSS snippets successfully (custom type)', async () => {
      const { vault } = await testVaultSetup()

      // Create source snippet file
      const sourceContent = `/* Custom CSS Snippet */
.markdown-source-view {
  font-family: 'JetBrains Mono', monospace;
}

.theme-dark {
  --text-accent: #ff6b6b;
}`

      const sourcePath = join(vault.path, 'source-snippet.css')
      writeFileSync(sourcePath, sourceContent)

      // Sync the snippet
      const result = await syncFileToVault({
        source: sourcePath,
        target: 'snippets/custom-theme.css',
        type: 'custom',
        vaultPath: vault.path,
        mergeStrategy: 'replace',
        overwrite: true,
        backup: true,
      })

      expect(result).toBe(true)

      // Verify the snippet was copied to the correct location
      const targetPath = join(
        vault.path,
        '.obsidian',
        'snippets',
        'custom-theme.css',
      )
      expect(existsSync(targetPath)).toBe(true)

      const targetContent = readFileSync(targetPath, 'utf8')
      expect(targetContent).toBe(sourceContent)

      destroyVault(vault.path)
    })

    it('should sync hotkeys configuration successfully (core type)', async () => {
      const { vault } = await testVaultSetup()

      // Create source hotkeys configuration
      const hotkeysConfig = {
        'editor:toggle-bold': [
          {
            modifiers: ['Mod'],
            key: 'b',
          },
        ],
        'workspace:split-vertical': [
          {
            modifiers: ['Mod', 'Shift'],
            key: 'v',
          },
        ],
        'note-toolbar:show-toolbar': [
          {
            modifiers: ['Mod', 'Alt'],
            key: 't',
          },
        ],
      }

      const sourcePath = join(vault.path, 'hotkeys-config.json')
      writeFileSync(sourcePath, JSON.stringify(hotkeysConfig, null, 2))

      // Sync the hotkeys
      const result = await syncFileToVault({
        source: sourcePath,
        target: 'hotkeys.json',
        type: 'core',
        vaultPath: vault.path,
        mergeStrategy: 'replace',
        overwrite: true,
        backup: true,
      })

      expect(result).toBe(true)

      // Verify the hotkeys were copied to the correct location
      const targetPath = join(vault.path, '.obsidian', 'hotkeys.json')
      expect(existsSync(targetPath)).toBe(true)

      const targetContent = JSON.parse(readFileSync(targetPath, 'utf8'))
      expect(targetContent).toEqual(hotkeysConfig)

      destroyVault(vault.path)
    })

    it('should merge hotkeys configuration with smart merge strategy', async () => {
      const { vault } = await testVaultSetup()

      // Create existing hotkeys in vault
      const existingHotkeys = {
        'editor:toggle-bold': [
          {
            modifiers: ['Mod'],
            key: 'b',
          },
        ],
        'workspace:toggle-pin': [
          {
            modifiers: ['Mod', 'Shift'],
            key: 'p',
          },
        ],
      }

      const targetPath = join(vault.path, '.obsidian', 'hotkeys.json')
      mkdirSync(join(vault.path, '.obsidian'), { recursive: true })
      writeFileSync(targetPath, JSON.stringify(existingHotkeys, null, 2))

      // Create new hotkeys to merge
      const newHotkeys = {
        'editor:toggle-bold': [
          {
            modifiers: ['Ctrl'],
            key: 'b',
          },
        ],
        'note-toolbar:show-toolbar': [
          {
            modifiers: ['Mod', 'Alt'],
            key: 't',
          },
        ],
      }

      const sourcePath = join(vault.path, 'new-hotkeys.json')
      writeFileSync(sourcePath, JSON.stringify(newHotkeys, null, 2))

      // Sync with smart merge
      const result = await syncFileToVault({
        source: sourcePath,
        target: 'hotkeys.json',
        type: 'core',
        vaultPath: vault.path,
        mergeStrategy: 'smart',
        overwrite: true,
        backup: true,
      })

      expect(result).toBe(true)

      // Verify merged result
      const mergedContent = JSON.parse(readFileSync(targetPath, 'utf8'))
      expect(mergedContent).toEqual({
        'editor:toggle-bold': [
          {
            modifiers: ['Ctrl'],
            key: 'b',
          },
        ], // Should be overwritten
        'workspace:toggle-pin': [
          {
            modifiers: ['Mod', 'Shift'],
            key: 'p',
          },
        ], // Should be preserved
        'note-toolbar:show-toolbar': [
          {
            modifiers: ['Mod', 'Alt'],
            key: 't',
          },
        ], // Should be added
      })

      // Verify backup was created
      expect(existsSync(`${targetPath}.bak`)).toBe(true)

      destroyVault(vault.path)
    })

    it('should handle include/exclude filters with smart merge', async () => {
      const { vault } = await testVaultSetup()

      // Create existing configuration
      const existingConfig = {
        setting1: 'keep-this',
        setting2: 'overwrite-this',
        setting3: 'exclude-this',
        nested: {
          prop1: 'keep-nested',
          prop2: 'overwrite-nested',
        },
      }

      const targetPath = join(vault.path, '.obsidian', 'app.json')
      mkdirSync(join(vault.path, '.obsidian'), { recursive: true })
      writeFileSync(targetPath, JSON.stringify(existingConfig, null, 2))

      // Create new configuration
      const newConfig = {
        setting2: 'new-value',
        setting3: 'should-be-excluded',
        setting4: 'new-setting',
        nested: {
          prop2: 'new-nested-value',
          prop3: 'new-nested-prop',
        },
      }

      const sourcePath = join(vault.path, 'new-config.json')
      writeFileSync(sourcePath, JSON.stringify(newConfig, null, 2))

      // Sync with include filter
      const result = await syncFileToVault({
        source: sourcePath,
        target: 'app.json',
        type: 'core',
        vaultPath: vault.path,
        mergeStrategy: 'smart',
        include: ['setting2', 'setting4', 'nested'],
        overwrite: true,
        backup: true,
      })

      expect(result).toBe(true)

      // Verify filtered merge result
      const mergedContent = JSON.parse(readFileSync(targetPath, 'utf8'))
      expect(mergedContent).toEqual({
        setting1: 'keep-this', // Preserved (not in source)
        setting2: 'new-value', // Updated (in include)
        setting3: 'exclude-this', // Preserved (not in include)
        setting4: 'new-setting', // Added (in include)
        nested: {
          prop1: 'keep-nested', // Preserved in nested
          prop2: 'new-nested-value', // Updated in nested
          prop3: 'new-nested-prop', // Added in nested
        },
      })

      destroyVault(vault.path)
    })

    it('should create directories recursively for nested paths', async () => {
      const { vault } = await testVaultSetup()

      const sourceContent = '.custom-class { color: red; }'
      const sourcePath = join(vault.path, 'source.css')
      writeFileSync(sourcePath, sourceContent)

      // Sync to deeply nested path
      const result = await syncFileToVault({
        source: sourcePath,
        target: 'themes/custom/dark/snippet.css',
        type: 'custom',
        vaultPath: vault.path,
        mergeStrategy: 'replace',
        overwrite: true,
        backup: false,
      })

      expect(result).toBe(true)

      // Verify nested directories were created
      const targetPath = join(
        vault.path,
        '.obsidian',
        'themes',
        'custom',
        'dark',
        'snippet.css',
      )
      expect(existsSync(targetPath)).toBe(true)

      const targetContent = readFileSync(targetPath, 'utf8')
      expect(targetContent).toBe(sourceContent)

      destroyVault(vault.path)
    })

    it('should skip sync when overwrite is false and target exists', async () => {
      const { vault } = await testVaultSetup()

      // Create existing target file
      const existingContent = 'existing content'
      const targetPath = join(vault.path, '.obsidian', 'existing.json')
      mkdirSync(join(vault.path, '.obsidian'), { recursive: true })
      writeFileSync(targetPath, existingContent)

      // Create source file
      const sourcePath = join(vault.path, 'source.json')
      writeFileSync(sourcePath, 'new content')

      // Try to sync with overwrite=false
      const result = await syncFileToVault({
        source: sourcePath,
        target: 'existing.json',
        type: 'core',
        vaultPath: vault.path,
        mergeStrategy: 'replace',
        overwrite: false,
        backup: true,
      })

      expect(result).toBe(false)

      // Verify original content is preserved
      const finalContent = readFileSync(targetPath, 'utf8')
      expect(finalContent).toBe(existingContent)

      destroyVault(vault.path)
    })

    it('should skip plugin sync when plugin not installed and onlyIfInstalled is true', async () => {
      const { vault } = await testVaultSetup()

      const sourcePath = join(vault.path, 'plugin-config.json')
      writeFileSync(sourcePath, '{"test": true}')

      // Try to sync to non-existent plugin with type 'plugin'
      const result = await syncFileToVault({
        source: sourcePath,
        target: 'data.json',
        type: 'plugin',
        vaultPath: vault.path,
        pluginId: 'non-existent-plugin',
        mergeStrategy: 'replace',
        overwrite: true,
        backup: true,
        onlyIfInstalled: true,
      })

      expect(result).toBe(false)

      // Verify no plugin directory was created
      const pluginPath = join(
        vault.path,
        '.obsidian',
        'plugins',
        'non-existent-plugin',
      )
      expect(existsSync(pluginPath)).toBe(false)

      destroyVault(vault.path)
    })

    it('should use simple merge strategy', async () => {
      const { vault } = await testVaultSetup()

      // Create existing configuration
      const existingConfig = {
        setting1: 'keep-this',
        setting2: 'overwrite-this',
        nested: {
          prop1: 'keep-nested',
        },
      }

      const targetPath = join(vault.path, '.obsidian', 'app.json')
      mkdirSync(join(vault.path, '.obsidian'), { recursive: true })
      writeFileSync(targetPath, JSON.stringify(existingConfig, null, 2))

      // Create new configuration
      const newConfig = {
        setting2: 'new-value',
        setting3: 'new-setting',
        nested: {
          prop2: 'new-nested-value',
        },
      }

      const sourcePath = join(vault.path, 'new-config.json')
      writeFileSync(sourcePath, JSON.stringify(newConfig, null, 2))

      // Sync with simple merge strategy
      const result = await syncFileToVault({
        source: sourcePath,
        target: 'app.json',
        type: 'core',
        vaultPath: vault.path,
        mergeStrategy: 'merge',
        overwrite: true,
        backup: true,
      })

      expect(result).toBe(true)

      // Verify simple merge result (shallow merge)
      const mergedContent = JSON.parse(readFileSync(targetPath, 'utf8'))
      expect(mergedContent).toEqual({
        setting1: 'keep-this',
        setting2: 'new-value', // Overwritten
        setting3: 'new-setting', // Added
        nested: {
          prop2: 'new-nested-value', // Completely replaced nested object
        },
      })

      destroyVault(vault.path)
    })

    it('should handle invalid JSON in source file during merge', async () => {
      const { vault } = await testVaultSetup()

      // Create valid existing configuration
      const existingConfig = { setting1: 'value1' }
      const targetPath = join(vault.path, '.obsidian', 'app.json')
      mkdirSync(join(vault.path, '.obsidian'), { recursive: true })
      writeFileSync(targetPath, JSON.stringify(existingConfig, null, 2))

      // Create invalid JSON source file
      const sourcePath = join(vault.path, 'invalid.json')
      writeFileSync(sourcePath, '{ invalid json }')

      // Try to sync with merge strategy
      const result = await syncFileToVault({
        source: sourcePath,
        target: 'app.json',
        type: 'core',
        vaultPath: vault.path,
        mergeStrategy: 'smart',
        overwrite: true,
        backup: true,
      })

      expect(result).toBe(false)

      // Verify original content is preserved
      const finalContent = JSON.parse(readFileSync(targetPath, 'utf8'))
      expect(finalContent).toEqual(existingConfig)

      destroyVault(vault.path)
    })

    it('should handle invalid JSON in target file during merge', async () => {
      const { vault } = await testVaultSetup()

      // Create invalid target file
      const targetPath = join(vault.path, '.obsidian', 'app.json')
      mkdirSync(join(vault.path, '.obsidian'), { recursive: true })
      writeFileSync(targetPath, '{ invalid json }')

      // Create valid source configuration
      const newConfig = { setting1: 'value1' }
      const sourcePath = join(vault.path, 'new-config.json')
      writeFileSync(sourcePath, JSON.stringify(newConfig, null, 2))

      // Try to sync with merge strategy
      const result = await syncFileToVault({
        source: sourcePath,
        target: 'app.json',
        type: 'core',
        vaultPath: vault.path,
        mergeStrategy: 'smart',
        overwrite: true,
        backup: true,
      })

      expect(result).toBe(false)

      // Verify backup was created but merge failed
      expect(existsSync(`${targetPath}.bak`)).toBe(true)

      destroyVault(vault.path)
    })

    it('should handle unknown merge strategy as fallback', async () => {
      const { vault } = await testVaultSetup()

      // Create existing configuration
      const existingConfig = { setting1: 'value1' }
      const targetPath = join(vault.path, '.obsidian', 'app.json')
      mkdirSync(join(vault.path, '.obsidian'), { recursive: true })
      writeFileSync(targetPath, JSON.stringify(existingConfig, null, 2))

      // Create new configuration
      const newConfig = { setting2: 'value2' }
      const sourcePath = join(vault.path, 'new-config.json')
      writeFileSync(sourcePath, JSON.stringify(newConfig, null, 2))

      // Sync with unknown merge strategy
      const result = await syncFileToVault({
        source: sourcePath,
        target: 'app.json',
        type: 'core',
        vaultPath: vault.path,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mergeStrategy: 'unknown' as any,
        overwrite: true,
        backup: true,
      })

      expect(result).toBe(true)

      // Verify fallback behavior (source overwrites target)
      const finalContent = JSON.parse(readFileSync(targetPath, 'utf8'))
      expect(finalContent).toEqual(newConfig)

      destroyVault(vault.path)
    })

    it('should handle exclude filters with smart merge', async () => {
      const { vault } = await testVaultSetup()

      // Create existing configuration
      const existingConfig = {
        setting1: 'keep-this',
        setting2: 'overwrite-this',
        setting3: 'exclude-this',
        nested: {
          prop1: 'keep-nested',
          prop2: 'overwrite-nested',
        },
      }

      const targetPath = join(vault.path, '.obsidian', 'app.json')
      mkdirSync(join(vault.path, '.obsidian'), { recursive: true })
      writeFileSync(targetPath, JSON.stringify(existingConfig, null, 2))

      // Create new configuration
      const newConfig = {
        setting2: 'new-value',
        setting3: 'should-be-excluded',
        setting4: 'new-setting',
        nested: {
          prop2: 'new-nested-value',
          prop3: 'new-nested-prop',
        },
      }

      const sourcePath = join(vault.path, 'new-config.json')
      writeFileSync(sourcePath, JSON.stringify(newConfig, null, 2))

      // Sync with exclude filter
      const result = await syncFileToVault({
        source: sourcePath,
        target: 'app.json',
        type: 'core',
        vaultPath: vault.path,
        mergeStrategy: 'smart',
        exclude: ['setting3'],
        overwrite: true,
        backup: true,
      })

      expect(result).toBe(true)

      // Verify filtered merge result
      const mergedContent = JSON.parse(readFileSync(targetPath, 'utf8'))
      expect(mergedContent).toEqual({
        setting1: 'keep-this', // Preserved (not in source)
        setting2: 'new-value', // Updated (not excluded)
        setting3: 'exclude-this', // Preserved (excluded)
        setting4: 'new-setting', // Added (not excluded)
        nested: {
          prop1: 'keep-nested', // Preserved in nested
          prop2: 'new-nested-value', // Updated in nested
          prop3: 'new-nested-prop', // Added in nested
        },
      })

      destroyVault(vault.path)
    })
  })

  describe('syncPluginConfigToVault', () => {
    const testVaultSetup = async (pluginId: string = 'note-toolbar') => {
      const { vault, config } = await setupVault()

      // Create plugin directory structure
      const pluginPath = join(vault.path, '.obsidian', 'plugins', pluginId)
      mkdirSync(pluginPath, { recursive: true })

      // Create manifest to simulate installed plugin
      writeFileSync(
        join(pluginPath, 'manifest.json'),
        JSON.stringify({
          id: pluginId,
          name: 'Note Toolbar',
          version: '1.0.0',
        }),
      )

      return { vault, config, pluginPath }
    }

    it('should sync Note Toolbar plugin configuration', async () => {
      const { vault, pluginPath } = await testVaultSetup('note-toolbar')

      // Create Note Toolbar configuration
      const noteToolbarConfig = {
        toolbars: [
          {
            name: 'Main Toolbar',
            items: [
              {
                label: 'Bold',
                icon: 'bold',
                command: 'editor:toggle-bold',
              },
              {
                label: 'Italic',
                icon: 'italic',
                command: 'editor:toggle-italics',
              },
              {
                label: 'Highlight',
                icon: 'highlighter',
                command: 'editor:toggle-highlight',
              },
            ],
          },
        ],
        showOnMobile: true,
        position: 'top',
      }

      const sourcePath = join(vault.path, 'note-toolbar-config.json')
      writeFileSync(sourcePath, JSON.stringify(noteToolbarConfig, null, 2))

      // Sync the plugin config
      const result = await syncPluginConfigToVault({
        source: sourcePath,
        target: 'data.json',
        pluginId: 'note-toolbar',
        vaultPath: vault.path,
        mergeStrategy: 'replace',
        overwrite: true,
        backup: true,
        onlyIfInstalled: true,
      })

      expect(result).toBe(true)

      // Verify the config was synced to the correct plugin directory
      const targetPath = join(pluginPath, 'data.json')
      expect(existsSync(targetPath)).toBe(true)

      const targetContent = JSON.parse(readFileSync(targetPath, 'utf8'))
      expect(targetContent).toEqual(noteToolbarConfig)

      destroyVault(vault.path)
    })

    it('should sync Commander plugin configuration', async () => {
      const { vault, pluginPath } = await testVaultSetup('cmdr')

      // Create Commander configuration
      const commanderConfig = {
        commands: [
          {
            name: 'Quick Note',
            icon: 'plus',
            color: '#3b82f6',
            command: 'templater-obsidian:create-new-note-from-template',
          },
          {
            name: 'Daily Note',
            icon: 'calendar',
            color: '#10b981',
            command: 'daily-notes:goto-today',
          },
        ],
        macros: [
          {
            name: 'Format Document',
            commands: [
              'editor:select-all',
              'obsidian-linter:lint-file',
              'editor:focus',
            ],
          },
        ],
        showInStatusBar: true,
        showInRibbon: false,
      }

      const sourcePath = join(vault.path, 'commander-config.json')
      writeFileSync(sourcePath, JSON.stringify(commanderConfig, null, 2))

      // Sync the plugin config
      const result = await syncPluginConfigToVault({
        source: sourcePath,
        target: 'data.json',
        pluginId: 'cmdr',
        vaultPath: vault.path,
        mergeStrategy: 'replace',
        overwrite: true,
        backup: true,
        onlyIfInstalled: true,
      })

      expect(result).toBe(true)

      // Verify the config was synced
      const targetPath = join(pluginPath, 'data.json')
      expect(existsSync(targetPath)).toBe(true)

      const targetContent = JSON.parse(readFileSync(targetPath, 'utf8'))
      expect(targetContent).toEqual(commanderConfig)

      destroyVault(vault.path)
    })

    it('should skip sync when plugin is not installed and onlyIfInstalled is true', async () => {
      const { vault } = await setupVault()

      const sourcePath = join(vault.path, 'config.json')
      writeFileSync(sourcePath, '{"test": true}')

      // Try to sync to non-existent plugin
      const result = await syncPluginConfigToVault({
        source: sourcePath,
        target: 'data.json',
        pluginId: 'non-existent-plugin',
        vaultPath: vault.path,
        mergeStrategy: 'replace',
        overwrite: true,
        backup: true,
        onlyIfInstalled: true,
      })

      expect(result).toBe(false)

      // Verify no plugin directory was created
      const pluginPath = join(
        vault.path,
        '.obsidian',
        'plugins',
        'non-existent-plugin',
      )
      expect(existsSync(pluginPath)).toBe(false)

      destroyVault(vault.path)
    })

    it('should merge plugin configurations using smart strategy', async () => {
      const { vault, pluginPath } = await testVaultSetup('dataview')

      // Create existing plugin configuration
      const existingConfig = {
        enableInlineDataview: true,
        enableDataviewJs: false,
        enableInlineDataviewJs: false,
        prettyRenderInlineFields: true,
        dataviewJsKeyword: 'dataviewjs',
        customSetting: 'keep-this',
      }

      const existingConfigPath = join(pluginPath, 'data.json')
      writeFileSync(existingConfigPath, JSON.stringify(existingConfig, null, 2))

      // Create new configuration to merge
      const newConfig = {
        enableInlineDataview: false, // Should override
        enableDataviewJs: true, // Should override
        defaultDateFormat: 'yyyy-MM-dd', // Should be added
        refreshInterval: 2500, // Should be added
      }

      const sourcePath = join(vault.path, 'dataview-updates.json')
      writeFileSync(sourcePath, JSON.stringify(newConfig, null, 2))

      // Sync with smart merge and include filter
      const result = await syncPluginConfigToVault({
        source: sourcePath,
        target: 'data.json',
        pluginId: 'dataview',
        vaultPath: vault.path,
        mergeStrategy: 'smart',
        include: ['enableInlineDataview', 'defaultDateFormat'],
        overwrite: true,
        backup: true,
        onlyIfInstalled: true,
      })

      expect(result).toBe(true)

      // Verify smart merge with include filter
      const mergedContent = JSON.parse(readFileSync(existingConfigPath, 'utf8'))
      expect(mergedContent).toEqual({
        enableInlineDataview: false, // Updated (in include)
        enableDataviewJs: false, // Preserved (not in include)
        enableInlineDataviewJs: false, // Preserved
        prettyRenderInlineFields: true, // Preserved
        dataviewJsKeyword: 'dataviewjs', // Preserved
        customSetting: 'keep-this', // Preserved
        defaultDateFormat: 'yyyy-MM-dd', // Added (in include)
        // refreshInterval not added (not in include)
      })

      // Verify backup was created
      expect(existsSync(`${existingConfigPath}.bak`)).toBe(true)

      destroyVault(vault.path)
    })

    it('should sync plugin config when onlyIfInstalled is false', async () => {
      const { vault } = await setupVault()

      const sourcePath = join(vault.path, 'config.json')
      const configData = { enabled: true, setting: 'value' }
      writeFileSync(sourcePath, JSON.stringify(configData, null, 2))

      // Sync to non-existent plugin with onlyIfInstalled=false
      const result = await syncPluginConfigToVault({
        source: sourcePath,
        target: 'data.json',
        pluginId: 'new-plugin',
        vaultPath: vault.path,
        mergeStrategy: 'replace',
        overwrite: true,
        backup: true,
        onlyIfInstalled: false,
      })

      expect(result).toBe(true)

      // Verify plugin directory and config were created
      const pluginPath = join(vault.path, '.obsidian', 'plugins', 'new-plugin')
      const configPath = join(pluginPath, 'data.json')
      expect(existsSync(configPath)).toBe(true)

      const configContent = JSON.parse(readFileSync(configPath, 'utf8'))
      expect(configContent).toEqual(configData)

      destroyVault(vault.path)
    })

    it('should handle null/empty JSON data during merge operations', async () => {
      const { vault } = await testVaultSetup()

      // Create empty target file (null JSON)
      const targetPath = join(vault.path, '.obsidian', 'app.json')
      mkdirSync(join(vault.path, '.obsidian'), { recursive: true })
      writeFileSync(targetPath, 'null')

      // Create empty source configuration (null JSON)
      const sourcePath = join(vault.path, 'new-config.json')
      writeFileSync(sourcePath, 'null')

      // Test merge strategy with null data
      const result1 = await syncFileToVault({
        source: sourcePath,
        target: 'app.json',
        type: 'core',
        vaultPath: vault.path,
        mergeStrategy: 'merge',
        overwrite: true,
        backup: false,
      })

      expect(result1).toBe(true)
      const mergedContent1 = JSON.parse(readFileSync(targetPath, 'utf8'))
      expect(mergedContent1).toEqual({})

      // Reset target to null
      writeFileSync(targetPath, 'null')

      // Test smart strategy with null data
      const result2 = await syncFileToVault({
        source: sourcePath,
        target: 'app.json',
        type: 'core',
        vaultPath: vault.path,
        mergeStrategy: 'smart',
        overwrite: true,
        backup: false,
      })

      expect(result2).toBe(true)
      const mergedContent2 = JSON.parse(readFileSync(targetPath, 'utf8'))
      expect(mergedContent2).toEqual({})

      // Reset target to null
      writeFileSync(targetPath, 'null')

      // Test unknown strategy with null data
      const result3 = await syncFileToVault({
        source: sourcePath,
        target: 'app.json',
        type: 'core',
        vaultPath: vault.path,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mergeStrategy: 'unknown' as any,
        overwrite: true,
        backup: false,
      })

      expect(result3).toBe(true)
      const mergedContent3 = JSON.parse(readFileSync(targetPath, 'utf8'))
      expect(mergedContent3).toEqual({})

      destroyVault(vault.path)
    })

    it('should handle mixed null and valid JSON data', async () => {
      const { vault } = await testVaultSetup()

      // Test with null target and valid source
      const targetPath = join(vault.path, '.obsidian', 'app.json')
      mkdirSync(join(vault.path, '.obsidian'), { recursive: true })
      writeFileSync(targetPath, 'null')

      const validConfig = { setting1: 'value1', setting2: 'value2' }
      const sourcePath = join(vault.path, 'valid-config.json')
      writeFileSync(sourcePath, JSON.stringify(validConfig, null, 2))

      const result1 = await syncFileToVault({
        source: sourcePath,
        target: 'app.json',
        type: 'core',
        vaultPath: vault.path,
        mergeStrategy: 'merge',
        overwrite: true,
        backup: false,
      })

      expect(result1).toBe(true)
      const mergedContent1 = JSON.parse(readFileSync(targetPath, 'utf8'))
      expect(mergedContent1).toEqual(validConfig)

      // Test with valid target and null source
      writeFileSync(targetPath, JSON.stringify(validConfig, null, 2))
      writeFileSync(sourcePath, 'null')

      const result2 = await syncFileToVault({
        source: sourcePath,
        target: 'app.json',
        type: 'core',
        vaultPath: vault.path,
        mergeStrategy: 'smart',
        overwrite: true,
        backup: false,
      })

      expect(result2).toBe(true)
      const mergedContent2 = JSON.parse(readFileSync(targetPath, 'utf8'))
      expect(mergedContent2).toEqual(validConfig) // Target data preserved when source is null

      destroyVault(vault.path)
    })
  })
})
