# ovm - Obsidian vaults manager

![NPM Version](https://img.shields.io/npm/v/ovm)
[![GitHub Actions Test Workflow Status](https://github.com/msudgh/ovm/actions/workflows/test.yml/badge.svg?branch=main)](https://github.com/msudgh/ovm/actions/workflows/test.yml)

**Table of Contents**

- [ovm - Obsidian vaults manager](#ovm---obsidian-vaults-manager)
  - [Usage](#usage)
  - [Commands](#commands)
    - [`ovm plugins install`](#ovm-plugins-install)
    - [`ovm plugins prune`](#ovm-plugins-prune)
    - [`ovm plugins uninstall`](#ovm-plugins-uninstall)
    - [`ovm reports stats`](#ovm-reports-stats)
    - [`ovm help [COMMAND]`](#ovm-help-command)
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

### `ovm plugins install`

Install plugins for Obsidian vaults.

```sh-session
USAGE
  $ ovm plugins install [-d] [-p <value>]

FLAGS
  -d, --debug         Enable debugging mode
  -p, --path=<value>  Path or Glob pattern of vaults to install plugins. Default: reads from Obsidian
                      config per environment.

DESCRIPTION
  Install plugins for Obsidian vaults.

ALIASES
  $ ovm pi
  $ ovm plugins install

EXAMPLES
  $ ovm plugins install --path=/path/to/vaults

  $ ovm plugins install --path=/path/to/vaults/*/.obsidian

  $ ovm plugins install --path=/path/to/vaults/**/.obsidian
```

_See code: [src/commands/plugins/install.ts](src/commands/plugins/install.ts)_

### `ovm plugins prune`

Prune plugins for Obsidian **vaults**.

```sh-session
USAGE
  $ ovm plugins prune [-d] [-p <value>]

FLAGS
  -d, --debug         Enable debugging mode
  -p, --path=<value>  Path or Glob pattern of vaults to prune plugins. Default: reads from Obsidian config
                      per environment.

DESCRIPTION
  Prune plugins for Obsidian vaults.

ALIASES
  $ ovm pp
  $ ovm plugins prune

EXAMPLES
  $ ovm plugins prune --path=/path/to/vaults

  $ ovm plugins prune --path=/path/to/vaults/*/.obsidian

  $ ovm plugins prune --path=/path/to/vaults/**/.obsidian
```

_See code: [src/commands/plugins/prune.ts](src/commands/plugins/prune.ts)_

### `ovm plugins uninstall`

Uninstall plugins for Obsidian vaults.

```sh-session
USAGE
  $ ovm plugins uninstall [-d] [-p <value>]

FLAGS
  -d, --debug         Enable debugging mode
  -p, --path=<value>  Path or Glob pattern of vaults to uninstall plugins. Default: reads from Obsidian
                      config per environment.

DESCRIPTION
  Uninstall plugins for Obsidian vaults.

ALIASES
  $ ovm pu
  $ ovm plugins uninstall

EXAMPLES
  $ ovm plugins uninstall --path=/path/to/vaults

  $ ovm plugins uninstall --path=/path/to/vaults/*/.obsidian

  $ ovm plugins uninstall --path=/path/to/vaults/**/.obsidian
```

_See code: [src/commands/plugins/uninstall.ts](src/commands/plugins/uninstall.ts)_

### `ovm reports stats`

Stats about number of vaults and installed plugins per vault.

```sh-session
USAGE
  $ ovm reports stats [-p <value>] [-o table|json] [-d] [-t]

FLAGS
  -d, --debug            Enable debugging mode
  -o, --output=<option>  [default: table] Display the output with a specific transformer.
                         <options: table|json>
  -p, --path=<value>     Path or Glob pattern of vaults to get stats from. Default: reads from
                         Obsidian per vault config per environment.
  -t, --timestamp        Enable timestamp in logs

DESCRIPTION
  Stats about number of vaults and installed plugins per vault.

ALIASES
  $ ovm rs
  $ ovm reports stats

EXAMPLES
  $ ovm reports stats --path=/path/to/vaults

  $ ovm reports stats --path=/path/to/vaults/*/.obsidian

  $ ovm reports stats --path=/path/to/vaults/**/.obsidian
```

_See code: [src/commands/reports/uninstall.ts](src/commands/reports/stats.ts)_

### `ovm help [COMMAND]`

Display help for ovm commands.

```sh-session
USAGE
  $ ovm help [COMMAND...] [-n]

ARGUMENTS
  COMMAND...  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for ovm.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v6.2.4/src/commands/help.ts)_

## License

This project is licensed under the [MIT License](LICENSE).
