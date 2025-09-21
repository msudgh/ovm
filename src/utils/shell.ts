import { homedir } from 'os'

export const untildify = (path: string): string =>
  path.replace(/^~($|\/|\\)/, `${homedir()}$1`)
