# Installation

## Prerequisites

- **Obsidian**: For managing Obsidian vaults
- **Node.js**: Version 18.0.0 or higher
- **npm**: Pre-installed with Node.js

## Global Installation

```bash
npm install -g ovm
```

## Verify Installation

After installation, verify that OVM is installed correctly:

```bash
ovm version
ovm/0.6.8 darwin-x64 node-v24.3.0  # Output may vary based on your system
```

Once installed, the configuration file needs to be created and customized
to fit your needs. To create a default configuration file, run:

```bash
$ ovm config init
info: Config file created {"path":"~/ovm.json"}
```

## Uninstallation

```bash
npm uninstall -g ovm
```
