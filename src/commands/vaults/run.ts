import { Args, Flags, flush } from '@oclif/core'
import { FactoryCommandWithVaults } from '../../providers/factory'
import { action } from '../../services/vault/run'
import { FactoryFlagsWithVaults, RunFlags } from '../../types/commands'
import { flagsInterceptor } from '../../utils/command'

export default class Run extends FactoryCommandWithVaults {
  static readonly aliases = ['r', 'run', 'vr', 'vaults run']
  static override readonly description = `Run a shell command on selected vaults (using Node.js child_process).\nDisclaimer: Any input containing shell metacharacters may be used to trigger arbitrary command execution, using of this command is at risk of command's caller.`
  static override readonly examples = [
    '<%= config.bin %> <%= command.id %> --path=/path/to/vaults',
    '<%= config.bin %> <%= command.id %> --path=/path/to/vaults/*/.obsidian --output=json',
    '<%= config.bin %> <%= command.id %> --path=/path/to/vaults/**/.obsidian --output=json --unescape=false',
    '<%= config.bin %> <%= command.id %> --output=json --async=false',
    '<%= config.bin %> <%= command.id %> --output=json --silent=true',
    '<%= config.bin %> <%= command.id %> --output=json --cwd=/path/to/vaults',
  ]
  static override readonly flags = {
    output: Flags.string({
      char: 'o',
      description: 'Display the output with a specific transformer.',
      default: 'table',
      options: ['table', 'json'],
    }),
    unescape: Flags.boolean({
      char: 'u',
      description:
        'Unescape special characters in a command to run as a single command.',
      default: true,
    }),
    async: Flags.boolean({
      char: 'a',
      description: 'Run the command in parallel on the vault(s).',
      default: true,
    }),
    silent: Flags.boolean({
      char: 's',
      description: 'Silent on results of the custom command on vault(s).',
      default: false,
    }),
    cwd: Flags.string({
      char: 'w',
      description:
        '[default: vault path] Set working directory for custom command.',
    }),
    ...this.commonFlagsWithPath,
  }

  static override readonly args = {
    command: Args.string({
      description:
        'Command to run and use specified vaults with each execution.',
      required: true,
      default: '',
    }),
  }

  /**
   * Executes the command.
   * Parses the arguments and flags, and calls the action method.
   * Handles errors and ensures flushing of logs.
   * @returns {Promise<void>}
   * @throws {Error} - Throws an error if the command fails.
   */
  public async run(): Promise<void> {
    try {
      const { args, flags } = await this.parse(Run)
      await action(
        args,
        flagsInterceptor<FactoryFlagsWithVaults<RunFlags>>(flags),
      )
    } catch (error) {
      this.handleError(error)
    } finally {
      flush()
    }
  }
}
