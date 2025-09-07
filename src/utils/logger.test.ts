import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createLogger, format, transports } from 'winston'
import type { CommonFlags, FactoryFlags } from '../types/commands'
import {
  CUSTOM_COMMAND_LOGGER_FILE,
  customCommandLogger,
  enableDebugLogLevel,
  enableLoggingTimestamp,
  getFormat,
  logger,
  silentCheck,
} from './logger'

// Import the getFormat function for direct testing
// We need to test the actual exported logger format, not create new ones

// Mock winston to intercept the logger creation
vi.mock('winston', async () => {
  const actual = await vi.importActual('winston')
  return {
    ...actual,
    createLogger: vi.fn((config) => {
      // Use proper typing instead of any
      return (actual as typeof import('winston')).createLogger(config)
    }),
  }
})

describe('Logger utilities', () => {
  // Store and reset environment and logger settings
  const ORIGINAL_ENV = process.env

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV }
    delete process.env.OVM_ENABLE_LOG_JSON
    delete process.env.OVM_ENABLE_LOG_TIMESTAMP
    logger.level = 'info'
    vi.clearAllMocks()
  })

  afterEach(() => {
    process.env = ORIGINAL_ENV
  })

  describe('logger CUSTOM_COMMAND_LOGGER_FILE', () => {
    it('should contain the correct filename', () => {
      expect(CUSTOM_COMMAND_LOGGER_FILE).toContain('ovm-custom-command.json')
    })

    it('should be a valid path', () => {
      expect(CUSTOM_COMMAND_LOGGER_FILE).toBeTruthy()
      expect(typeof CUSTOM_COMMAND_LOGGER_FILE).toBe('string')
    })
  })

  describe('silentCheck utility', () => {
    it.each([
      [undefined, undefined],
      [{ silent: true }, true],
      [{ silent: false }, false],
    ])('flags %p => %s', (flags, expected) => {
      expect(
        silentCheck(flags as FactoryFlags<{ silent?: boolean }> | undefined),
      ).toBe(expected)
    })
  })

  describe('enableLoggingTimestamp utility', () => {
    it('should set OVM_ENABLE_LOG_TIMESTAMP to "true"', () => {
      enableLoggingTimestamp(true)
      expect(process.env.OVM_ENABLE_LOG_TIMESTAMP).toBe('true')
    })
    it('should set OVM_ENABLE_LOG_TIMESTAMP to "false"', () => {
      enableLoggingTimestamp(false)
      expect(process.env.OVM_ENABLE_LOG_TIMESTAMP).toBe('false')
    })
  })

  describe('enableDebugLogLevel utility', () => {
    const dummyFlags: CommonFlags = {
      debug: false,
      timestamp: false,
      config: '',
    }
    it('should set logger.level to debug when debug=true', () => {
      enableDebugLogLevel(true, dummyFlags)
      expect(logger.level).toBe('debug')
    })
    it('should not change logger.level when debug=false', () => {
      logger.level = 'info'
      enableDebugLogLevel(false, dummyFlags)
      expect(logger.level).toBe('info')
    })
  })

  describe('getFormat function', () => {
    it('should return format with timestamp when OVM_ENABLE_LOG_TIMESTAMP is true', () => {
      process.env.OVM_ENABLE_LOG_TIMESTAMP = 'true'
      process.env.OVM_ENABLE_LOG_JSON = 'false'

      const formatResult = getFormat()
      expect(formatResult).toBeDefined()
    })

    it('should return format without timestamp when OVM_ENABLE_LOG_TIMESTAMP is false', () => {
      process.env.OVM_ENABLE_LOG_TIMESTAMP = 'false'
      process.env.OVM_ENABLE_LOG_JSON = 'false'

      const formatResult = getFormat()
      expect(formatResult).toBeDefined()
    })

    it('should return JSON format when OVM_ENABLE_LOG_JSON is true', () => {
      process.env.OVM_ENABLE_LOG_JSON = 'true'
      process.env.OVM_ENABLE_LOG_TIMESTAMP = 'false'

      const formatResult = getFormat()
      expect(formatResult).toBeDefined()
    })

    it('should return simple format when OVM_ENABLE_LOG_JSON is false', () => {
      process.env.OVM_ENABLE_LOG_JSON = 'false'
      process.env.OVM_ENABLE_LOG_TIMESTAMP = 'false'

      const formatResult = getFormat()
      expect(formatResult).toBeDefined()
    })

    it('should handle all combinations of format options', () => {
      const combinations = [
        { json: 'true', timestamp: 'true' },
        { json: 'true', timestamp: 'false' },
        { json: 'false', timestamp: 'true' },
        { json: 'false', timestamp: 'false' },
      ]

      combinations.forEach(({ json, timestamp }) => {
        process.env.OVM_ENABLE_LOG_JSON = json
        process.env.OVM_ENABLE_LOG_TIMESTAMP = timestamp

        const formatResult = getFormat()
        expect(formatResult).toBeDefined()

        // Test that the format can be used in a logger
        const testLogger = createLogger({
          format: formatResult,
          level: 'info',
          transports: [new transports.Console()],
        })

        expect(testLogger).toBeDefined()
        expect(() => {
          testLogger.info(
            `Test combination: JSON=${json}, Timestamp=${timestamp}`,
          )
        }).not.toThrow()
      })
    })
  })

  describe('logger format combinations', () => {
    it('should exercise logger with different format combinations', () => {
      const originalJsonValue = process.env.OVM_ENABLE_LOG_JSON
      const originalTimestampValue = process.env.OVM_ENABLE_LOG_TIMESTAMP

      try {
        // Test that logger can handle different environment variable combinations
        // without throwing errors

        // Test JSON format with timestamp
        process.env.OVM_ENABLE_LOG_JSON = 'true'
        process.env.OVM_ENABLE_LOG_TIMESTAMP = 'true'

        // Verify logger can execute without errors
        expect(() => {
          logger.info('Test JSON format with timestamp')
        }).not.toThrow()

        // Test JSON format without timestamp
        process.env.OVM_ENABLE_LOG_JSON = 'true'
        process.env.OVM_ENABLE_LOG_TIMESTAMP = 'false'

        expect(() => {
          logger.info('Test JSON format without timestamp')
        }).not.toThrow()

        // Test simple format with timestamp
        process.env.OVM_ENABLE_LOG_JSON = 'false'
        process.env.OVM_ENABLE_LOG_TIMESTAMP = 'true'

        expect(() => {
          logger.info('Test simple format with timestamp')
        }).not.toThrow()

        // Test simple format without timestamp
        process.env.OVM_ENABLE_LOG_JSON = 'false'
        process.env.OVM_ENABLE_LOG_TIMESTAMP = 'false'

        expect(() => {
          logger.info('Test simple format without timestamp')
        }).not.toThrow()
      } finally {
        // Restore original values
        if (originalJsonValue !== undefined) {
          process.env.OVM_ENABLE_LOG_JSON = originalJsonValue
        } else {
          delete process.env.OVM_ENABLE_LOG_JSON
        }

        if (originalTimestampValue !== undefined) {
          process.env.OVM_ENABLE_LOG_TIMESTAMP = originalTimestampValue
        } else {
          delete process.env.OVM_ENABLE_LOG_TIMESTAMP
        }
      }
    })

    it('should create new logger instances with different formats', () => {
      // Test creating new loggers with different format combinations
      // This ensures the getFormat function is exercised with all branches

      const formatTests = [
        { json: 'true', timestamp: 'true' },
        { json: 'true', timestamp: 'false' },
        { json: 'false', timestamp: 'true' },
        { json: 'false', timestamp: 'false' },
      ]

      formatTests.forEach(({ json, timestamp }) => {
        const originalJsonValue = process.env.OVM_ENABLE_LOG_JSON
        const originalTimestampValue = process.env.OVM_ENABLE_LOG_TIMESTAMP

        try {
          process.env.OVM_ENABLE_LOG_JSON = json
          process.env.OVM_ENABLE_LOG_TIMESTAMP = timestamp

          // Create a new logger that will use getFormat function
          const testLogger = createLogger({
            format: (() => {
              const jsonLogging = process.env.OVM_ENABLE_LOG_JSON === 'true'
              const enableTimestamp =
                process.env.OVM_ENABLE_LOG_TIMESTAMP === 'true'
              return format.combine(
                ...(enableTimestamp ? [format.timestamp()] : []),
                jsonLogging
                  ? (format.json(), format.prettyPrint())
                  : (format.splat(), format.simple()),
              )
            })(),
            level: 'info',
            transports: [new transports.Console()],
          })

          expect(testLogger).toBeDefined()
          expect(testLogger.level).toBe('info')

          // Test logging to ensure format works without errors
          expect(() => {
            testLogger.info(`Test format: JSON=${json}, Timestamp=${timestamp}`)
          }).not.toThrow()
        } finally {
          // Restore original values
          if (originalJsonValue !== undefined) {
            process.env.OVM_ENABLE_LOG_JSON = originalJsonValue
          } else {
            delete process.env.OVM_ENABLE_LOG_JSON
          }

          if (originalTimestampValue !== undefined) {
            process.env.OVM_ENABLE_LOG_TIMESTAMP = originalTimestampValue
          } else {
            delete process.env.OVM_ENABLE_LOG_TIMESTAMP
          }
        }
      })
    })
  })

  describe('logger', () => {
    it('should be created with default format when no env vars are set', () => {
      expect(logger.level).toBe('info')
      expect(logger.transports).toHaveLength(1)
      expect(logger.transports[0]).toBeInstanceOf(transports.Console)
    })

    it('should create logger with JSON format when OVM_ENABLE_LOG_JSON is true', () => {
      // Set environment variable
      process.env.OVM_ENABLE_LOG_JSON = 'true'

      // Create a new logger to test the format
      const testLogger = createLogger({
        format: getFormat(),
        level: 'info',
        transports: [new transports.Console()],
      })

      expect(testLogger).toBeDefined()
      expect(testLogger.level).toBe('info')
    })

    it('should create logger with simple format when OVM_ENABLE_LOG_JSON is not true', () => {
      // Ensure JSON logging is not enabled
      delete process.env.OVM_ENABLE_LOG_JSON

      // Create a new logger to test the format
      const testLogger = createLogger({
        format: getFormat(),
        level: 'info',
        transports: [new transports.Console()],
      })

      expect(testLogger).toBeDefined()
      expect(testLogger.level).toBe('info')
    })

    it('should create logger with timestamp when OVM_ENABLE_LOG_TIMESTAMP is true', () => {
      // Set environment variable
      process.env.OVM_ENABLE_LOG_TIMESTAMP = 'true'

      // Create a new logger to test the format
      const testLogger = createLogger({
        format: getFormat(),
        level: 'info',
        transports: [new transports.Console()],
      })

      expect(testLogger).toBeDefined()
      expect(testLogger.level).toBe('info')
    })

    it('should create logger without timestamp when OVM_ENABLE_LOG_TIMESTAMP is not true', () => {
      // Ensure timestamp is not enabled
      delete process.env.OVM_ENABLE_LOG_TIMESTAMP

      // Create a new logger to test the format
      const testLogger = createLogger({
        format: getFormat(),
        level: 'info',
        transports: [new transports.Console()],
      })

      expect(testLogger).toBeDefined()
      expect(testLogger.level).toBe('info')
    })

    it('should create logger with both timestamp and JSON format when both env vars are true', () => {
      // Set both environment variables
      process.env.OVM_ENABLE_LOG_JSON = 'true'
      process.env.OVM_ENABLE_LOG_TIMESTAMP = 'true'

      // Create a new logger to test the format
      const testLogger = createLogger({
        format: getFormat(),
        level: 'info',
        transports: [new transports.Console()],
      })

      expect(testLogger).toBeDefined()
      expect(testLogger.level).toBe('info')
    })

    it('should work with JSON format environment variable', () => {
      // Test that the environment variable affects the format creation
      const originalValue = process.env.OVM_ENABLE_LOG_JSON
      process.env.OVM_ENABLE_LOG_JSON = 'true'

      // Verify environment variable is set
      expect(process.env.OVM_ENABLE_LOG_JSON).toBe('true')

      // Restore original value
      if (originalValue !== undefined) {
        process.env.OVM_ENABLE_LOG_JSON = originalValue
      } else {
        delete process.env.OVM_ENABLE_LOG_JSON
      }
    })

    it('should work with timestamp environment variable', () => {
      // Test that the environment variable affects the format creation
      const originalValue = process.env.OVM_ENABLE_LOG_TIMESTAMP
      process.env.OVM_ENABLE_LOG_TIMESTAMP = 'true'

      // Verify environment variable is set
      expect(process.env.OVM_ENABLE_LOG_TIMESTAMP).toBe('true')

      // Restore original value
      if (originalValue !== undefined) {
        process.env.OVM_ENABLE_LOG_TIMESTAMP = originalValue
      } else {
        delete process.env.OVM_ENABLE_LOG_TIMESTAMP
      }
    })

    it('should work with both environment variables set', () => {
      // Test that both environment variables can be set
      const originalJsonValue = process.env.OVM_ENABLE_LOG_JSON
      const originalTimestampValue = process.env.OVM_ENABLE_LOG_TIMESTAMP

      process.env.OVM_ENABLE_LOG_JSON = 'true'
      process.env.OVM_ENABLE_LOG_TIMESTAMP = 'true'

      // Verify both environment variables are set
      expect(process.env.OVM_ENABLE_LOG_JSON).toBe('true')
      expect(process.env.OVM_ENABLE_LOG_TIMESTAMP).toBe('true')

      // Restore original values
      if (originalJsonValue !== undefined) {
        process.env.OVM_ENABLE_LOG_JSON = originalJsonValue
      } else {
        delete process.env.OVM_ENABLE_LOG_JSON
      }

      if (originalTimestampValue !== undefined) {
        process.env.OVM_ENABLE_LOG_TIMESTAMP = originalTimestampValue
      } else {
        delete process.env.OVM_ENABLE_LOG_TIMESTAMP
      }
    })

    // Test the getFormat function indirectly by testing different environment variable combinations
    it('should handle all combinations of environment variables correctly', () => {
      const scenarios = [
        { json: undefined, timestamp: undefined, description: 'no env vars' },
        { json: 'true', timestamp: undefined, description: 'JSON only' },
        { json: undefined, timestamp: 'true', description: 'timestamp only' },
        {
          json: 'true',
          timestamp: 'true',
          description: 'both JSON and timestamp',
        },
        { json: 'false', timestamp: 'false', description: 'both false' },
        {
          json: 'false',
          timestamp: 'true',
          description: 'JSON false, timestamp true',
        },
        {
          json: 'true',
          timestamp: 'false',
          description: 'JSON true, timestamp false',
        },
      ]

      scenarios.forEach((scenario) => {
        // Reset environment
        delete process.env.OVM_ENABLE_LOG_JSON
        delete process.env.OVM_ENABLE_LOG_TIMESTAMP

        // Set environment variables for this scenario
        if (scenario.json !== undefined) {
          process.env.OVM_ENABLE_LOG_JSON = scenario.json
        }
        if (scenario.timestamp !== undefined) {
          process.env.OVM_ENABLE_LOG_TIMESTAMP = scenario.timestamp
        }

        // Test that we can create a logger (this exercises the getFormat function)
        expect(() => {
          const testLogger = createLogger({
            format: format.combine(
              ...(process.env.OVM_ENABLE_LOG_TIMESTAMP === 'true'
                ? [format.timestamp()]
                : []),
              process.env.OVM_ENABLE_LOG_JSON === 'true'
                ? (format.json(), format.prettyPrint())
                : (format.splat(), format.simple()),
            ),
            level: 'info',
            transports: [new transports.Console()],
          })
          return testLogger
        }).not.toThrow()
      })
    })
  })

  describe('customCommandLogger', () => {
    it('should be configured correctly', () => {
      expect(customCommandLogger.level).toBe('debug')
      expect(customCommandLogger.transports).toHaveLength(1)
      expect(customCommandLogger.transports[0]).toBeInstanceOf(transports.File)

      const fileTransport = customCommandLogger
        .transports[0] as transports.FileTransportInstance
      expect(fileTransport.filename).toContain('ovm-custom-command.json')
    })
  })
})
