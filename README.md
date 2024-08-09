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
  - [`ovm config init`](#ovm-config-init)
  - [`ovm plugins install`](#ovm-plugins-install)
  - [`ovm plugins prune`](#ovm-plugins-prune)
  - [`ovm plugins uninstall`](#ovm-plugins-uninstall)
  - [`ovm reports stats`](#ovm-reports-stats)
  - [`ovm vaults run`](#ovm-vaults-run)
    - [Reserved placeholders](#reserved-placeholders)
- [License](#license)

## Features

- **Manage Obsidian plugins**: Install/Uninstall/Prune plugins in multiple vaults at one go.
- **Perform actions on Obsidian or custom vaults**: By default, Obsidian vaults are supported and detected. The vault-related commands support `-p` flag to define a custom vault/s from a path or [`Glob`](<https://en.wikipedia.org/wiki/Glob_(programming)>) pattern. e.g. `~/Documents/obsidian/*`.
- **Generate reports**: Generate statistics of vaults and installed plugins with Table/JSON output format.
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

The config file is created in the user's home directory by [`ovm ci`](#ovm-config-init--ovm-ci) and is named `ovm.json`. It contains an array of plugins that are to be installed across single/multiple vault.

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

### `ovm config init`
Aliases: `ovm ci`

Configure an ovm.json config file in user's home directory.

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

### `ovm plugins install`
Aliases: `ovm pi`

Install plugin(s) in specified vaults.

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

### `ovm plugins prune`
Aliases: `ovm pp`

Prune existing plugin(s) from vaults that are unspecified in the config file.

- _Usage:_ `ovm help plugins prune`
- _See code:_ [src/commands/plugins/prune.ts](src/commands/plugins/prune.ts)

Output

```bash
$ ovm plugins prune
? Select the vaults: Test
info: Removed plugin {"pluginId":"obsidian-tasks-plugin","vaultPath":"~/Documents/obsidian/Test"}
info: Pruned 1 plugins {"vault":{"name":"Test","path":"~/Documents/obsidian/Test"}}
```

### `ovm plugins uninstall`
Aliases: `ovm pu`

Uninstall plugin(s) from vaults.

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

### `ovm reports stats`
Aliases: `ovm rs`

Statistics of vaults and installed plugins.

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

### `ovm vaults run`
Aliases: `ovm vr` / `ovm r` / `ovm run`

Run a shell command on selected vaults (using Node.js child_process).

- _Usage:_ `ovm help vaults run`
- _See code:_ [src/commands/vaults/run.ts](src/commands/vaults/run.ts)

Output: `Table (default)` / `JSON`

```bash
$ ovm run -s "tar -cf '{0}.tar' '{0}'" -o=json
? Select the vaults: Career, Financial, Goals
info: Run command {"command":"tar -cf '~/Documents/obsidian/Career.tar' '~/Documents/obsidian/Career'","vault":{"name":"Career","path":"~/Documents/obsidian/Career"}}

info: Run operation finished! {"custom_commands_log_path":"/var/folders/_v/j4w6kv1s27b6xjfzvl5k6lqm0000gn/T/ovm-custom-command.json"}
{
  "Career": {
    "success": true,
    "duration": "2 seconds",
    "error": null
  },
  "Financial": {
    "success": true,
    "duration": "1 second",
    "error": null
  },
  "Goals": {
    "success": true,
    "duration": "1 second",
    "error": null
  }
}

$ ovm r "echo 'Path: {0}'"
info: Run command {"command":"echo 'Path: ~/Documents/obsidian/Career'","vault":{"name":"Career","path":"~/Documents/obsidian/Career"}}

Path: ~/Documents/obsidian/Career

info: Run operation finished! {"custom_commands_log_path":"/var/folders/_v/j4w6kv1s27b6xjfzvl5k6lqm0000gn/T/ovm-custom-command.json"}
┌─────────┬─────────┬──────────┬───────┐
│ (index) │ success │ duration │ error │
├─────────┼─────────┼──────────┼───────┤
│ Career  │ true    │ '10 ms'  │ null  │
└─────────┴─────────┴──────────┴───────┘
```

#### Reserved placeholders

A custom command can be executed on vault(s) by using reserved placeholders as string value within the shell command. The placeholders are replaced with the actual values during the execution.

List of placeholders:
- `{0}`: Vault path
- `{1}`: Vault name

Examples:

- Echo vault(s) path
  - `ovm run "echo 'Path: {0}'"`
- Echo vault(s) path and name
  - `ovm run "echo 'Path: {0}, Name: {1}'"`
- Echo vault(s) name and silent the command's result
  - `ovm run -s "echo 'Path: {0}'"`
- Create an archive of vault(s) by `tar` command
  - `ovm run "tar -cf '{0}.tar' '{0}'"`
- Encrypt vault(s) directory by `gpg` command [algo: `AES256`, passphrase `password`]
  - `ovm run "tar -cf '{0}.tar' '{0}' && gpg --batch --symmetric --cipher-algo AES256 --passphrase 'password' '{0}.tar'"`
- Decrypt the archive of vault(s) by `gpg` command [passphrase: `password`]
  - `ovm run "gpg -q --batch --decrypt --passphrase 'password' -o '{0}.tar' '{0}.tar.gpg'"`

## License

This project is licensed under the [MIT License](LICENSE).
