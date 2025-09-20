import { Command, Flags } from '@oclif/core'
import { OutputFormat } from '../types/commands'
import { handlerCommandError } from '../utils/command'
import { DEFAULT_CONFIG_PATH, DESCRIPTIONS } from '../utils/constants'
import { outputFormats } from '../utils/flags'

const commonFlags = {
  debug: Flags.boolean({
    char: 'd',
    default: false,
    description: DESCRIPTIONS.debug,
  }),
  timestamp: Flags.boolean({
    char: 't',
    default: false,
    description: DESCRIPTIONS.timestamp,
  }),
  config: Flags.file({
    char: 'c',
    description: DESCRIPTIONS.config,
    default: DEFAULT_CONFIG_PATH,
    required: false,
  }),
}

const outputFlag = Flags.string({
  char: 'o',
  description: DESCRIPTIONS.output,
  default: 'table' as OutputFormat,
  options: outputFormats,
})

class FactoryCommand extends Command {
  static readonly commonFlags = commonFlags

  run(): Promise<unknown> {
    throw new Error('Method not implemented.')
  }

  public handleError(error: unknown) {
    handlerCommandError(error)
  }
}

class FactoryCommandWithVaults extends Command {
  static readonly commonFlagsWithPath = {
    ...FactoryCommand.commonFlags,
    path: Flags.string({
      char: 'p',
      description: DESCRIPTIONS.path,
      default: '',
    }),
  }

  static readonly commonFlags = FactoryCommandWithVaults.commonFlagsWithPath

  run(): Promise<unknown> {
    throw new Error('Method not implemented.')
  }

  public handleError(error: unknown) {
    handlerCommandError(error)
  }
}

export { FactoryCommand, FactoryCommandWithVaults, outputFlag }
