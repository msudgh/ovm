![NPM Version](https://img.shields.io/npm/v/ovm)
![GitHub License](https://img.shields.io/github/license/msudgh/ovm)
[![GitHub Actions Test Workflow Status](https://github.com/msudgh/ovm/actions/workflows/test.yml/badge.svg?branch=main)](https://github.com/msudgh/ovm/actions/workflows/test.yml)

ovm (Obsidian Vaults Manager) is a CLI application designed to streamline the management of vaults in Obsidian. This tool aims to overcome the limitations associated with performing bulk tasks on specific vaults and plugins. It enables users to install, uninstall, prune, and generate reports for a set of favorite plugins across multiple vaults, enhancing productivity and efficiency.

**Table of Contents**

- [Usage](#usage)
- [Commands](#commands)
  - [`ovm config init`](#ovm-config-init)
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

### `ovm config init`

Configure an ovm.json config file in user's home dir.

- _Usage:_ `ovm help config init`
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
