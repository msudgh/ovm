# ovm - Obsidian vaults manager

![NPM Version](https://img.shields.io/npm/v/ovm)
[![GitHub Actions Test Workflow Status](https://github.com/msudgh/ovm/actions/workflows/test.yml/badge.svg?branch=main)](https://github.com/msudgh/ovm/actions/workflows/test.yml)

This project is designed to improve the management of vaults in obsidian, to remove the limitations of doing bulk tasks. It works outside of the Obsidian environment as a CLI application which provides the possibility of re-configuring plugins. E.g. Install, uninstall, prune, reports a set of favorite plugins in one or several vaults.

**Table of Contents**

- [ovm - Obsidian vaults manager](#ovm---obsidian-vaults-manager)
  - [Usage](#usage)
  - [Commands](#commands)
    - [`ovm plugins init`](#ovm-plugins-init)
    - [`ovm plugins install`](#ovm-plugins-install)
    - [`ovm plugins prune`](#ovm-plugins-prune)
    - [`ovm plugins uninstall`](#ovm-plugins-uninstall)
    - [`ovm reports stats`](#ovm-reports-stats)
  - [License](#license)

## Usage

```sh-session
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

## Commands

### `ovm plugins init`

Configure an ovm.json config file in user's home dir.

- _Usage:_ `ovm help config`
- _See code:_ [src/commands/config/init.ts](src/commands/config/init.ts)

### `ovm plugins install`

Install plugins in specified vaults.

- _Usage:_ `ovm help plugins install`
- _See code:_ [src/commands/plugins/install.ts](src/commands/plugins/install.ts)

### `ovm plugins prune`

Prune plugins from specified vaults.

- _Usage:_ `ovm help plugins prune`
- _See code:_ [src/commands/plugins/prune.ts](src/commands/plugins/prune.ts)

### `ovm plugins uninstall`

Uninstall plugins from specified vaults.

- _Usage:_ `ovm help plugins uninstall`
- _See code:_ [src/commands/plugins/uninstall.ts](src/commands/plugins/uninstall.ts)

### `ovm reports stats`

Stats of vaults and installed plugins.

- _Usage:_ `ovm help plugins stats`
- _See code:_ [src/commands/reports/stats.ts](src/commands/reports/stats.ts)

## License

This project is licensed under the [MIT License](LICENSE).
