import { tmpdir } from 'os'
import { join } from 'path'
import { createLogger, format, Logform, transports } from 'winston'
import {
  CommonFlags,
  FactoryFlags,
  FactoryFlagsWithVaults,
} from '../types/commands'

export const CUSTOM_COMMAND_LOGGER_FILE = join(
  tmpdir(),
  'ovm-custom-command.json',
)

export const getFormat = (): Logform.Format => {
  const jsonLogging = process.env.OVM_ENABLE_LOG_JSON === 'true'
  const enableTimestamp = process.env.OVM_ENABLE_LOG_TIMESTAMP === 'true'
  return format.combine(
    ...(enableTimestamp ? [format.timestamp()] : []),
    jsonLogging
      ? (format.json(), format.prettyPrint())
      : (format.splat(), format.simple()),
  )
}

export const logger = createLogger({
  format: getFormat(),
  level: 'info',
  transports: [new transports.Console()],
})

export const customCommandLogger = createLogger({
  level: 'debug',
  transports: [
    new transports.File({
      filename: CUSTOM_COMMAND_LOGGER_FILE,
      format: format.combine(
        format.timestamp(),
        format.json(),
        format.prettyPrint(),
      ),
    }),
  ],
})

export const silentCheck = <T>(
  flags?: FactoryFlags<T> | FactoryFlagsWithVaults<T>,
) => flags && 'silent' in flags && flags.silent

export const enableLoggingTimestamp = (timestamp: boolean) => {
  process.env.OVM_ENABLE_LOG_TIMESTAMP = timestamp ? 'true' : 'false'
}

export const enableDebugLogLevel = (
  debug: boolean,
  flags: CommonFlags | FactoryFlags<unknown> | FactoryFlagsWithVaults<unknown>,
) => {
  if (debug) {
    logger.level = 'debug'
    logger.debug(`Command called`, { flags })
  }
}
