[![NPM Version](https://img.shields.io/npm/v/ovm)](http://npmjs.com/package/ovm)
[![GitHub License](https://img.shields.io/github/license/msudgh/ovm)](LICENSE)
[![GitHub Actions Test Workflow Status](https://github.com/msudgh/ovm/actions/workflows/test.yml/badge.svg?branch=main)](https://github.com/msudgh/ovm/actions/workflows/test.yml)

ovm (Obsidian Vaults Manager) is a CLI application designed to streamline the management of vaults in Obsidian. This tool aims to overcome the limitations associated with performing bulk tasks on specific vaults and plugins. It enables users to install, uninstall, prune, and generate reports for a set of favorite plugins across multiple vaults, enhancing productivity and efficiency.

**Table of Contents**

- [Features](#features)
- [Requirements](#requirements)
- [Usage](#usage)
- [Config file](#config-file)
- [Commands](#commands)
  - [`ovm config init` / `ovm ci`](#ovm-config-init--ovm-ci)
  - [`ovm plugins install` / `ovm pi`](#ovm-plugins-install--ovm-pi)
  - [`ovm plugins prune` / `ovm pp`](#ovm-plugins-prune--ovm-pp)
  - [`ovm plugins uninstall` / `ovm pu`](#ovm-plugins-uninstall--ovm-pu)
  - [`ovm reports stats` / `ovm rs`](#ovm-reports-stats--ovm-rs)
- [License](#license)

## Features

- **Manage Obsidian plugins**: Install/Uninstall/Prune plugins in multiple vaults at one go.
- **Perform actions on Obsidian or custom vaults**: By default, Obsidian vaults are supported and detected. The vaults related commands support `-p` flag to define a custom vault/s from a path or [`Glob`](<https://en.wikipedia.org/wiki/Glob_(programming)>) pattern. e.g. `~/Documents/obsidian/*`.
- **Generate reports**: Generate stats of vaults and installed plugins with Table/JSON format.
- **Interactive CLI**: User-friendly interface to select vaults and plugins for each command.
- **Cross-platform**: Windows, macOS, and Linux.

## Requirements

- Node.js 18.x or higher

## Usage

```bash
$ npm install -g ovm
$ ovm version
ovm/0.1.0 darwin-x64 node-v20.11.0 # Output may vary
$ ovm COMMAND
running command...
$ ovm --help [COMMAND]
USAGE
  $ ovm COMMAND
...
```

**Common flags**

```bash
  -c, --config=<value>  [default: ~/ovm.json] Path to the config file.
  -d, --debug           Enable debugging mode.
  -t, --timestamp       Enable timestamp in logs.
```

## Config file

The config file is created in the user's home directory and is named `ovm.json` by [`ovm ci`](#ovm-config-init--ovm-ci). It contains an array of plugins that are to be installed across single/multiple vault.

```json
{
  "plugins": []
}
```

Example config file for following [Commands](#commands) section is as follows:

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

## Commands

> The content used in the examples below is for illustrative purposes only. e.g. In the output sections, the vaults are stored in `~/Documents/` directory. The actual output may vary.

### `ovm config init` / `ovm ci`

Configure an ovm.json config file in user's home dir.

- _Usage:_ `ovm help config init`
- _See code:_ [src/commands/config/init.ts](src/commands/config/init.ts)

Output

```bash
$ ovm config init
info: Config file created {"path":"~/ovm.json"}

$ cat ~/ovm.json
{
  "plugins": []
}
```

### `ovm plugins install` / `ovm pi`

Install plugin/s in specified vaults.

- _Usage:_ `ovm help plugins install`
- _See code:_ [src/commands/plugins/install.ts](src/commands/plugins/install.ts)

Output

```bash
$ ovm plugins install
? Select the vaults: Career, Financial, Goals
info: Installed plugin {"plugin":{"id":"colored-tags","version":"latest"},"vault":{"name":"Career","path":"~/Documents/obsidian/Career"}}
info: Installed plugin {"plugin":{"id":"copilot","version":"latest"},"vault":{"name":"Career","path":"~/Documents/obsidian/Career"}}
info: Installed plugin {"plugin":{"id":"dataview","version":"latest"},"vault":{"name":"Career","path":"~/Documents/obsidian/Career"}}
info: Installed 3 plugins {"vault":{"name":"Career","path":"~/Documents/obsidian/Career"}}
info: Installed plugin {"plugin":{"id":"colored-tags","version":"latest"},"vault":{"name":"Financial","path":"~/Documents/obsidian/Financial"}}
info: Installed plugin {"plugin":{"id":"copilot","version":"latest"},"vault":{"name":"Financial","path":"~/Documents/obsidian/Financial"}}
info: Installed plugin {"plugin":{"id":"dataview","version":"latest"},"vault":{"name":"Financial","path":"~/Documents/obsidian/Financial"}}
info: Installed 3 plugins {"vault":{"name":"Financial","path":"~/Documents/obsidian/Financial"}}
info: Installed plugin {"plugin":{"id":"colored-tags","version":"latest"},"vault":{"name":"Goals","path":"~/Documents/obsidian/Goals"}}
info: Installed plugin {"plugin":{"id":"copilot","version":"latest"},"vault":{"name":"Goals","path":"~/Documents/obsidian/Goals"}}
info: Installed plugin {"plugin":{"id":"dataview","version":"latest"},"vault":{"name":"Goals","path":"~/Documents/obsidian/Goals"}}
info: Installed 3 plugins {"vault":{"name":"Goals","path":"~/Documents/obsidian/Goals"}}
```

### `ovm plugins prune` / `ovm pp`

Prune existing plugin/s from vaults which are unspecified in the config file.

- _Usage:_ `ovm help plugins prune`
- _See code:_ [src/commands/plugins/prune.ts](src/commands/plugins/prune.ts)

Output

```bash
$ ovm plugins prune
? Select the vaults: Test
info: Removed plugin {"pluginId":"obsidian-tasks-plugin","vaultPath":"~/Documents/obsidian/Test"}
info: Pruned 1 plugins {"vault":{"name":"Test","path":"~/Documents/obsidian/Test"}}
```

### `ovm plugins uninstall` / `ovm pu`

Uninstall plugin/s from vaults.

- _Usage:_ `ovm help plugins uninstall`
- _See code:_ [src/commands/plugins/uninstall.ts](src/commands/plugins/uninstall.ts)

Output

```bash
$ ovm plugins uninstall
? Select the vaults: Career, Financial, Goals
? Select the plugins: colored-tags, copilot, dataview
info: Removed plugin {"pluginId":"colored-tags","vaultPath":"~/Documents/obsidian/Career"}
info: Removed plugin {"pluginId":"copilot","vaultPath":"~/Documents/obsidian/Career"}
info: Removed plugin {"pluginId":"dataview","vaultPath":"~/Documents/obsidian/Career"}
info: Uninstalled 3 plugins {"vault":{"name":"Career","path":"~/Documents/obsidian/Career"}}
info: Removed plugin {"pluginId":"colored-tags","vaultPath":"~/Documents/obsidian/Financial"}
info: Removed plugin {"pluginId":"copilot","vaultPath":"~/Documents/obsidian/Financial"}
info: Removed plugin {"pluginId":"dataview","vaultPath":"~/Documents/obsidian/Financial"}
info: Uninstalled 3 plugins {"vault":{"name":"Financial","path":"~/Documents/obsidian/Financial"}}
info: Removed plugin {"pluginId":"colored-tags","vaultPath":"~/Documents/obsidian/Goals"}
info: Removed plugin {"pluginId":"copilot","vaultPath":"~/Documents/obsidian/Goals"}
info: Removed plugin {"pluginId":"dataview","vaultPath":"~/Documents/obsidian/Goals"}
info: Uninstalled 3 plugins {"vault":{"name":"Goals","path":"~/Documents/obsidian/Goals"}}
```

### `ovm reports stats` / `ovm rs`

Stats of vaults and installed plugins.

- _Usage:_ `ovm help reports stats`
- _See code:_ [src/commands/reports/stats.ts](src/commands/reports/stats.ts)

Output: `Table (default)` / `JSON`

```bash
$ ovm reports stats
? Select the vaults: Career, Financial, Goals
┌──────────────┬────────┐
│ (index)      │ Values │
├──────────────┼────────┤
│ totalVaults  │ 3      │
│ totalPlugins │ 3      │
└──────────────┴────────┘
┌──────────────────────────────────────────────────┬─────────────┬─────────────┬─────────┐
│ (index)                                          │ 0           │ 1           │ 2       │
├──────────────────────────────────────────────────┼─────────────┼─────────────┼─────────┤
│ colored-tags@5.0.0 (118.78 kB)                   │ 'Career'    │ 'Financial' │ 'Goals' │
│ copilot@2.5.2 (4.02 MB)                          │ 'Career'    │             │         │
│ dataview@0.5.67 (2.38 MB)                        │ 'Career'    │ 'Financial' │         │
└──────────────────────────────────────────────────┴─────────────┴─────────────┴─────────┘
```

## License

This project is licensed under the [MIT License](LICENSE).
