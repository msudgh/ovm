import { Command, Flags } from '@oclif/core'
import { handlerCommandError } from '../utils/command'
import {
  DEFAULT_CONFIG_PATH,
  VAULTS_PATH_FLAG_DESCRIPTION,
} from '../utils/constants'

const commonFlags = {
  debug: Flags.boolean({
    char: 'd',
    default: false,
    description: 'Enable debugging mode.',
  }),
  timestamp: Flags.boolean({
    char: 't',
    default: false,
    description: 'Enable timestamp in logs.',
  }),
  config: Flags.file({
    char: 'c',
    description: `Path to the config file.`,
    default: DEFAULT_CONFIG_PATH,
    required: false,
  }),
}

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
      description: VAULTS_PATH_FLAG_DESCRIPTION,
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

export { FactoryCommand, FactoryCommandWithVaults }
