# Commands

> OVM automatically detects Obsidian vaults for related commands and by using the `-p` flag with a path or a Glob pattern specify custom vaults (e.g., ~/Documents/obsidian/\*).
> The content used in the examples below is for illustrative purposes only. e.g. In the output sections, the vaults are stored in `~/Documents/` directory.

All of the commands have a common set of options:

```bash
  -c, --config=<value>  [default: ~/ovm.json] Path to the config file.
  -d, --debug           Enable debugging mode.
  -t, --timestamp       Enable timestamp in logs.
```

## `ovm config init`

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

## `ovm plugins install`

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

## `ovm plugins prune`

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

## `ovm plugins uninstall`

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

## `ovm plugins sync`

Aliases: `ovm ps` / `ovm plugins sync`

Sync plugin configuration files (data.json) defined in ovm.json (sync) across vaults.

- _Usage:_ `ovm help plugins sync`
- _See code:_ [src/commands/plugins/sync.ts](src/commands/plugins/sync.ts)

Options:

- `--overwrite`: Overwrite existing destination files (default: true)
- `--backup`: Create a .bak backup if destination exists (default: true)
- `--only-installed`: Skip vaults where plugin is not installed (default: true)
- `--plugin-id`: Sync only specific plugin (if not specified, sync all plugins)
- `--merge-strategy`: Strategy for merging configs - replace, merge, smart (default: replace)

Output

```bash
$ ovm plugins sync --path=/path/to/vaults/**/.obsidian
? Select the vaults: Career, Work, Personal
info: Syncing plugin configs on selected vaults... {"vaults":3,"pluginId":"all plugins"}
info: Merged ./configs/dataview-settings.json into ~/Documents/obsidian/Career/.obsidian/plugins/dataview/data.json using strategy: replace
info: Merged ./configs/calendar-settings.json into ~/Documents/obsidian/Career/.obsidian/plugins/calendar/data.json using strategy: replace
info: Skipped dataview config, plugin not installed in ~/Documents/obsidian/Work
info: Plugin config sync finished!
```

Examples:

- Sync all plugin configurations: `ovm plugins sync`
- Sync specific plugin: `ovm plugins sync --plugin-id=dataview --no-backup`
- Use smart merge strategy: `ovm plugins sync --merge-strategy=smart`

## `ovm reports stats`

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

## `ovm vaults run`

Aliases: `ovm vr` / `ovm vaults run`

Run a shell command on selected vaults (using Node.js child_process).

**Disclaimer: Any input containing shell metacharacters may be used to trigger arbitrary command execution, using of this command is at risk of command's caller.**

- _Usage:_ `ovm help vaults run`
- _See code:_ [src/commands/vaults/run.ts](src/commands/vaults/run.ts)

Output: `Table (default)` / `JSON`

```bash
$ ovm vaults run -s "tar -cf '{0}.tar' '{0}'" -o=json
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

info: Run operation finished! {"custom_commands_log_path":"/var/folders/_v/j4w6kv1s27b6xjfzvl5k6lqm0000gn/T/ovm-custom-command.json"}

┌─────────┬─────────┬──────────┬───────┬─────────────────────────────────────────┐
│ (index) │ success │ duration │ error │ stdout                                 │
├─────────┼─────────┼──────────┼───────┼─────────────────────────────────────────┤
│ Career  │ true    │ '10 ms'  │ null  │ 'Path: ~/Documents/obsidian/Career'    │
└─────────┴─────────┴──────────┴───────┴─────────────────────────────────────────┘
```

### Reserved placeholders

A custom command can be executed on vault(s) by using reserved placeholders as string value within the shell command. The placeholders are replaced with the actual values during the execution.

List of placeholders:

- `{0}`: Vault path
- `{1}`: Vault name

Examples:

- Echo vault(s) path
  - `ovm vaults run "echo 'Path: {0}'"`
- Echo vault(s) path and name
  - `ovm vaults run "echo 'Path: {0}, Name: {1}'"`
- Echo vault(s) name and silent the command's result
  - `ovm vaults run -s "echo 'Path: {0}'"`
- Create an archive of vault(s) by `tar` command
  - `ovm vaults run "tar -cf '{0}.tar' '{0}'"`
- Encrypt vault(s) directory by `gpg` command [algo: `AES256`, passphrase `password`]
  - `ovm vaults run "tar -cf '{0}.tar' '{0}' && gpg --batch --symmetric --cipher-algo AES256 --passphrase 'password' '{0}.tar'"`
- Decrypt the archive of vault(s) by `gpg` command [passphrase: `password`]
  - `ovm vaults run "gpg -q --batch --decrypt --passphrase 'password' -o '{0}.tar' '{0}.tar.gpg'"`

## `ovm vaults sync`

Aliases: `ovm vs`

Sync core, custom, and theme configuration files defined in ovm.json (sync) across vaults.

- _Usage:_ `ovm help vaults sync`
- _See code:_ [src/commands/vaults/sync.ts](src/commands/vaults/sync.ts)

Options:

- `--overwrite`: Overwrite existing destination files (default: true)
- `--backup`: Create a .bak backup if destination exists (default: true)
- `--merge-strategy`: Strategy for merging configs - replace, merge, smart (default: replace)

Output

```bash
$ ovm vaults sync --path=/path/to/vaults/**/.obsidian
? Select the vaults: Career, Work, Personal
info: Syncing core vault configs on selected vaults... {"vaults":3}
info: Copied ./configs/appearance.json to ~/Documents/obsidian/Goals/.obsidian/appearance.json
info: Copied ./configs/app.json to ~/Documents/obsidian/Notes/.obsidian/app.json
info: Merged ./configs/workspace.json into ~/Documents/obsidian/Career/.obsidian/workspace.json using strategy: replace
info: Vault core config sync finished!
```

Examples:

- Sync all core configurations: `ovm vaults sync`
- No backup: `ovm vaults sync --no-backup`
- Use smart merge strategy: `ovm vaults sync --merge-strategy=smart`
