import {ExitPromptError} from '@inquirer/core'
import {Command, Flags, handle} from '@oclif/core'
import {Vault} from 'obsidian-utils'
import {findVaultsByPatternMatching, findVaultsFromConfig} from '../services/vaults'
import {logger} from '../utils/logger'

export type FactoryFlags<T> = T & {
  debug: boolean
  timestamp: boolean
}

export default class FactoryCommand extends Command {
  static readonly commonFlags = {
    debug: Flags.boolean({
      char: 'd',
      default: false,
      description: 'Enable debugging mode',
    }),
    timestamp: Flags.boolean({
      char: 't',
      default: false,
      description: 'Enable timestamp in logs',
    }),
  }

  run(): Promise<unknown> {
    throw new Error('Method not implemented.')
  }

  public flagsInterceptor<T>(flags: FactoryFlags<T>): FactoryFlags<T> {
    const {debug, timestamp} = flags

    if (debug) {
      logger.level = 'debug'
      logger.debug(`Command called`, {flags})
      process.env.ENABLE_TIMESTAMP = timestamp ? 'true' : 'false'
    }

    return flags
  }

  /**
   * Loads vaults based on the specified path or from the configuration.
   * If a path is specified, it will find vaults by pattern matching.
   * If no path is specified, it will find vaults from the Obsidian configuration.
   * Throws an error if no vaults are found.
   *
   * @param path - The path to search for vaults.
   * @returns A promise that resolves to an array of Vault objects.
   * @throws An error if no vaults are found.
   */
  public async loadVaults(path: string): Promise<Vault[]> {
    const isPathSpecifiedAndValid = path && path.trim().length > 0
    let vaults: Vault[] = []

    if (isPathSpecifiedAndValid) {
      vaults = await findVaultsByPatternMatching(path)
    } else {
      vaults = await findVaultsFromConfig()
    }

    if (vaults.length === 0) {
      throw new Error(`No vaults found!`)
    }

    return vaults
  }

  public handleError(error: unknown) {
    if (error instanceof ExitPromptError) {
      logger.debug('Exit prompt error:', {error})
    } else if (error instanceof Error) {
      logger.debug('An error occurred while installation:', {error})
      handle(error)
    }
  }
}