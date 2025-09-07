import { ExitPromptError } from '@inquirer/core'
import { ChildProcess } from 'child_process'
import { Vault } from 'obsidian-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  asyncExecCustomCommand,
  flagsInterceptor,
  handlerCommandError,
} from './command'
import { isTestEnv } from './env'
import * as logger from './logger'

vi.mock('./logger', () => ({
  enableDebugLogLevel: vi.fn(),
  enableLoggingTimestamp: vi.fn(),
  logger: {
    debug: vi.fn(),
  },
}))
vi.mock('@oclif/core', () => ({
  handle: vi.fn(),
}))
vi.mock('@inquirer/core', () => ({
  ExitPromptError: class ExitPromptError extends Error {},
}))
vi.mock('child_process', () => ({
  exec: vi.fn(),
}))

describe('Command utilities', () => {
  describe('Environment detection', () => {
    const originalNodeEnv = process.env.NODE_ENV
    const originalCI = process.env.CI

    afterEach(() => {
      process.env.NODE_ENV = originalNodeEnv
      process.env.CI = originalCI
    })

    it('should detect a test environment', async () => {
      expect(isTestEnv()).to.be.true
    })

    it('should detect test environment when CI is true', () => {
      process.env.NODE_ENV = 'production'
      process.env.CI = 'true'
      expect(isTestEnv()).to.be.true
    })

    it('should not detect test environment when neither NODE_ENV is test nor CI is true', () => {
      process.env.NODE_ENV = 'production'
      process.env.CI = 'false'
      expect(isTestEnv()).to.be.false
    })
  })

  describe('flagsInterceptor', () => {
    it('should call logger utilities with correct parameters and return flags', () => {
      const mockFlags = {
        debug: true,
        timestamp: true,
        config: '/path/to/config',
        otherFlag: 'test',
      }

      const result = flagsInterceptor(mockFlags)

      expect(logger.enableLoggingTimestamp).toHaveBeenCalledWith(true)
      expect(logger.enableDebugLogLevel).toHaveBeenCalledWith(true, mockFlags)
      expect(result).toEqual(mockFlags)
    })

    it('should work with debug and timestamp as false', () => {
      const mockFlags = {
        debug: false,
        timestamp: false,
        config: '/path/to/config',
        otherFlag: 'test',
      }

      const result = flagsInterceptor(mockFlags)

      expect(logger.enableLoggingTimestamp).toHaveBeenCalledWith(false)
      expect(logger.enableDebugLogLevel).toHaveBeenCalledWith(false, mockFlags)
      expect(result).toEqual(mockFlags)
    })

    it('should work with minimal CommonFlags interface', () => {
      const mockFlags = {
        debug: false,
        timestamp: false,
        config: '',
      }

      const result = flagsInterceptor(mockFlags)

      expect(logger.enableLoggingTimestamp).toHaveBeenCalledWith(false)
      expect(logger.enableDebugLogLevel).toHaveBeenCalledWith(false, mockFlags)
      expect(result).toEqual(mockFlags)
    })
  })

  describe('handlerCommandError', () => {
    const originalCI = process.env.CI

    afterEach(() => {
      process.env.CI = originalCI
      vi.clearAllMocks()
    })

    it('should throw error if CI env is set to "true"', () => {
      process.env.CI = 'true'
      const error = new Error('Test error')

      expect(() => handlerCommandError(error)).toThrow(error)
    })

    it('should throw error if CI env is truthy', () => {
      process.env.CI = 'yes'
      const error = new Error('Test error')

      expect(() => handlerCommandError(error)).toThrow(error)
    })

    it('should handle ExitPromptError and log debug message', () => {
      process.env.CI = undefined
      const error = new ExitPromptError()

      handlerCommandError(error)

      expect(logger.logger.debug).toHaveBeenCalledWith('Exit prompt error:', {
        error,
      })
    })

    it('should handle other errors and call handle function', async () => {
      process.env.CI = undefined
      const error = new Error('Test error')
      const { handle } = await import('@oclif/core')

      handlerCommandError(error)

      expect(logger.logger.debug).toHaveBeenCalledWith(
        'An error occurred while installation:',
        { error },
      )
      expect(handle).toHaveBeenCalledWith(error)
    })

    it('should handle non-Error objects', async () => {
      process.env.CI = undefined
      const error = 'string error'
      const { handle } = await import('@oclif/core')

      handlerCommandError(error)

      expect(logger.logger.debug).toHaveBeenCalledWith(
        'An error occurred while installation:',
        { error },
      )
      expect(handle).toHaveBeenCalledWith(error)
    })
  })

  describe('asyncExecCustomCommand', () => {
    afterEach(() => {
      vi.clearAllMocks()
    })

    it('should resolve with stderr and stdout on successful execution', async () => {
      const { exec } = await import('child_process')
      const mockExec = vi.mocked(exec)

      // Mock successful execution
      mockExec.mockImplementation((command, options, callback) => {
        if (callback) {
          callback(null, 'stdout content', 'stderr content')
        }
        return {} as ChildProcess // Return a mock ChildProcess
      })

      const vault: Vault = { name: 'test-vault', path: '/test/path' }
      const command = 'echo "test"'
      const cwd = '/test/cwd'

      const result = await asyncExecCustomCommand(vault, command, cwd)
      expect(result).toBe('stderr content\nstdout content')
      expect(mockExec).toHaveBeenCalledWith(
        'echo "test"',
        { cwd },
        expect.any(Function),
      )
    })

    it('should reject when exec encounters an error', async () => {
      const { exec } = await import('child_process')
      const mockExec = vi.mocked(exec)

      const testError = new Error('Command failed')
      // Mock failed execution
      mockExec.mockImplementation((command, options, callback) => {
        if (callback) {
          callback(testError, '', '')
        }
        return {} as ChildProcess // Return a mock ChildProcess
      })

      const vault: Vault = { name: 'test-vault', path: '/test/path' }
      const command = 'false' // Command that fails
      const cwd = '/test/cwd'

      await expect(asyncExecCustomCommand(vault, command, cwd)).rejects.toThrow(
        'Command failed',
      )
      expect(mockExec).toHaveBeenCalledWith(
        'false',
        { cwd },
        expect.any(Function),
      )
    })
  })
})
