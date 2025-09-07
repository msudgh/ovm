# Installation

## Prerequisites

- **Node.js**: Version 18.0.0 or higher
- **npm**: Comes with Node.js
- **Obsidian**: For managing Obsidian vaults

## Global Installation

Install globally using npm:

```bash
npm install -g ovm
```

## Verify Installation

After installation, verify that OVM is installed correctly:

```bash
$ ovm version
ovm/0.6.8 darwin-x64 node-v24.3.0  # Output may vary based on your system

$ ovm --help
Obsidian Vaults Manager

VERSION
  ovm/0.6.8 darwin-x64 node-v24.3.0

USAGE
  $ ovm [COMMAND]

TOPICS
  config   Configure an ovm.json config file in user's home dir.
  plugins  Manage plugins of the vaults
  reports  Reports on vaults
  vaults   Perform tasks on vaults
```

## Alternative Installation Methods

### Using pnpm

```bash
pnpm add -g ovm
```

### Using Yarn

```bash
yarn global add ovm
```

## Update OVM

To update OVM to the latest version:

```bash
npm update -g ovm
```

## Uninstallation

To remove OVM from your system:

```bash
npm uninstall -g ovm
```

## Post-Installation Setup

After installing OVM, you should initialize a configuration file:

```bash
$ ovm config init
info: Config file created {"path":"~/ovm.json"}
```

This creates a default configuration file at `~/ovm.json` that you can customize according to your needs.
