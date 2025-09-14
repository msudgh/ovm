import { ExitPromptError } from '@inquirer/core'
import { handle } from '@oclif/core'
import { exec } from 'child_process'
import { Vault } from 'obsidian-utils'
import { CommonFlags } from '../types/commands'
import { RESERVED_VARIABLES } from './constants'
import { isTestEnv } from './env'
import { enableDebugLogLevel, enableLoggingTimestamp, logger } from './logger'

const isTest = isTestEnv()

export const flagsInterceptor = <T extends CommonFlags>(flags: T): T => {
  const { debug, timestamp } = flags

  enableLoggingTimestamp(timestamp)
  enableDebugLogLevel(debug, flags)

  return flags
}

export const handlerCommandError = (error: unknown) => {
  // Only throw in CI when CI env is explicitly 'true', 'yes', or '1'
  const ci = process.env.CI?.toLowerCase()
  if (ci === 'true' || ci === 'yes' || ci === '1') {
    throw error
  }

  // Detect ExitPromptError to gracefully exit with a user-friendly message
  if (
    error instanceof ExitPromptError ||
    (error instanceof Error && error.name === 'ExitPromptError')
  ) {
    logger.debug('Exit prompt error:', { error })
    console.log('Selection canceled.')

    if (!isTest) {
      process.exit(0)
    }
  } else {
    logger.debug('An error occurred while installation:', { error })
    return handle(error as Error)
  }
}

const commandInterpolation = (vault: Vault, command: string): string => {
  const variableRegex = /\{(\d*?)}/g
  const replacer = (match: string, variable: string) => {
    const variableFunction = RESERVED_VARIABLES[variable]

    if (variableFunction) {
      return variableFunction(vault)
    } else {
      return match
    }
  }
  const interpolatedCommand = command.replace(variableRegex, replacer)

  return interpolatedCommand
}

export const asyncExecCustomCommand = async (
  vault: Vault,
  command: string,
  cwd: string,
): Promise<string> =>
  new Promise((resolve, reject) => {
    exec(
      commandInterpolation(vault, command),
      { cwd },
      (error, stdout, stderr) => {
        if (error) {
          reject(error)
        }
        resolve(`${stderr}\n${stdout}`)
      },
    )
  })
