import { tmpdir } from 'os'
import { join } from 'path'
import { createLogger, format, transports } from 'winston'

export const CUSTOM_COMMAND_LOGGER_FILE = join(
  tmpdir(),
  'ovm-custom-command.json',
)

const getFormat = () => {
  const jsonLogging = process.env.OVM_ENABLE_LOG_JSON === 'true'
  const enableTimestamp = process.env.OVM_ENABLE_LOG_TIMESTAMP === 'true'
  return format.combine(
    format.colorize(),
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
