import {createLogger, format, transports} from 'winston'

const getFormat = () => {
  const jsonLogging = process.env.JSON_LOGGING === 'true'
  const enableTimestamp = process.env.ENABLE_TIMESTAMP === 'true'
  return format.combine(
    format.colorize(),
    ...(enableTimestamp ? [format.timestamp()] : []),
    jsonLogging ? (format.json(), format.prettyPrint()) : (format.splat(), format.simple()),
  )
}

export const logger = createLogger({
  format: getFormat(),
  level: 'info',
  transports: [new transports.Console()],
})
