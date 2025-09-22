# Configuration

By default, `ovm.json` config file lives in current home directory and contains
configuration for vault core and plugins. `ovm config init` can be used to create
a new config file with default settings.

## Specifications

### Plugins

Define plugins in your config file with the following structure:

```json
{
  "plugins": [
    {
      "id": "colored-tags",
      "version": "latest"
    },
    {
      "id": "copilot",
      "version": "latest"
    },
    {
      "id": "dataview",
      "version": "latest"
    }
  ]
}
```

> Versioning of plugins follows [Semantic Versioning](https://semver.org/) and [Obsidian Plugin Guidelines](https://publish.obsidian.md/api/Plugin+Development/Plugin+Guidelines). `latest` is a valid version specifier that always resolves to the latest compatible version.

### Sync

Define synchronization entries using `sync` to automatically sync core settings, plugin configurations, custom files, and themes across vaults of Obsidian. `ovm vault sync` and `ovm plugins sync` in [commands](commands.md) can be used to initiate the synchronization process.

```json
{
  "plugins": [
    { "id": "dataview", "version": "latest" },
    { "id": "note-toolbar", "version": "latest" }
  ],
  "sync": {
    "files": [
      {
        "source": "./configs/appearance.json",
        "target": "appearance.json",
        "type": "core",
        "mergeStrategy": "replace"
      },
      {
        "source": "./configs/dataview-settings.json",
        "target": "data.json",
        "type": "plugin",
        "pluginId": "dataview",
        "mergeStrategy": "smart",
        "include": ["enableInlineDataview", "defaultDateFormat"],
        "onlyIfInstalled": true
      },
      {
        "source": "./configs/custom-hotkeys.json",
        "target": "hotkeys.json",
        "type": "custom",
        "vaults": ["Work", "Personal"],
        "backup": true
      }
    ]
  }
}
```

#### Options

##### Entry Properties

- **`source`** (required): Path to the source configuration file (relative to config directory or absolute)
- **`target`** (required): Target file path (relative to vault's `.obsidian` directory)
- **`type`** (required): Type of configuration - `core`, `plugin`, `custom`, or `all`
- **`pluginId`** (optional): For plugin configs, the plugin ID (required when type is `plugin`)
- **`mergeStrategy`** (optional): How to merge configs - `replace`, `merge`, or `smart` (default: `replace`)
- **`vaults`** (optional): Array of vault names to target (if empty, applies to all selected vaults)
- **`onlyIfInstalled`** (optional): For plugin configs, only sync if plugin is installed (default: `true`)
- **`include`** (optional): Array of JSON keys to include when using `smart` merge strategy
- **`exclude`** (optional): Array of JSON keys to exclude when using `smart` merge strategy
- **`backup`** (optional): Create `.bak` backup if destination exists (default: inherits from command flags)
- **`overwrite`** (optional): Overwrite existing files without prompting (default: inherits from command flags)

##### Merge Strategies

- **`replace`**: Completely replace the target file with source content
- **`merge`**: Simple shallow merge of JSON objects (source overwrites target keys)
- **`smart`**: Deep merge with support for include/exclude filters

##### Configuration Types

- **`core`**: Obsidian core settings (placed directly in `.obsidian/`)
- **`plugin`**: Plugin-specific configurations (placed in `.obsidian/plugins/<pluginId>/`)
- **`custom`**: Custom files and themes (placed according to target path within `.obsidian/`)
- **`all`**: Matches all configuration types (used for filtering)

## Default Configuration

```json
{
  "plugins": [],
  "sync": {
    "files": []
  }
}
```
