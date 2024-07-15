# ovm - an Obsidian vaults manager

![NPM Version](https://img.shields.io/npm/v/ovm)
[![GitHub Actions Test Workflow Status](https://github.com/msudgh/ovm/actions/workflows/test.yml/badge.svg?branch=main)](https://github.com/msudgh/ovm/actions/workflows/test.yml)

## Table of Contents

- [ovm - an Obsidian vaults manager](#ovm---an-obsidian-vaults-manager)
  - [Table of Contents](#table-of-contents)
  - [Usage](#usage)
  - [Commands](#commands)
    - [`ovm ip`](#ovm-ip)
    - [`ovm pp`](#ovm-pp)
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

### `ovm ip`

Install plugins for Obsidian vaults.

```
USAGE
  $ ovm ip [-d] [-p <value>]

FLAGS
  -d, --debug         Enable debugging mode
  -p, --path=<value>  Path or Glob pattern of vaults to install plugins. Default: reads from Obsidian
                      config per environment.

DESCRIPTION
  Install plugins for Obsidian vaults.

ALIASES
  $ ovm ip
  $ ovm install-plugins

EXAMPLES
  $ ovm ip --path=/path/to/vaults

  $ ovm ip --path=/path/to/vaults/*/.obsidian

  $ ovm ip --path=/path/to/vaults/**/.obsidian
```

_See code: [src/commands/plugins/install.ts](src/commands/plugins/install.ts)_

### `ovm pp`

Prune plugins for Obsidian **vaults**.

```
USAGE
  $ ovm pp [-d] [-p <value>]

FLAGS
  -d, --debug         Enable debugging mode
  -p, --path=<value>  Path or Glob pattern of vaults to prune plugins. Default: reads from Obsidian
                      config per environment.

DESCRIPTION
  Prune plugins for Obsidian vaults.

ALIASES
  $ ovm pp
  $ ovm prune-plugins

EXAMPLES
  $ ovm pp --path=/path/to/vaults

  $ ovm pp --path=/path/to/vaults/*/.obsidian

  $ ovm pp --path=/path/to/vaults/**/.obsidian
```

_See code: [src/commands/plugins/prune.ts](src/commands/plugins/prune.ts)_

### `ovm help [COMMAND]`

Display help for ovm commands.

```
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
