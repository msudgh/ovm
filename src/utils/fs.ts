import { BigIntStats, Dirent, promises as fs } from 'node:fs'
import { join } from 'node:path'
import { logger } from './logger'

export const convertSizeToReadableUnit = (size: number | bigint): string => {
  // Supported units
  const units = ['B', 'KB', 'MB', 'GB']
  let index = 0
  let value = Number(size)

  while (value >= 1024 && index < units.length - 1) {
    value /= 1024
    index++
  }

  // Remove decimal places for zero size
  if (value === 0) {
    return `0 ${units[index]}`
  }

  return `${value.toFixed(2)} ${units[index]}`
}

export const getFileSize = async (
  path: string,
  concurrency = 64,
  humanReadable = false,
): Promise<bigint | string> => {
  // Validate input path
  let stat: BigIntStats
  try {
    stat = await fs.stat(path, { bigint: true })
    if (!stat.isDirectory()) {
      throw new Error(`Path "${path}" is not a directory`)
    }
  } catch (err) {
    const typedError = err as NodeJS.ErrnoException
    if (typedError.code === 'ENOENT') {
      throw new Error(`Path "${path}" does not exist`)
    }

    throw new Error(`Failed to access path "${path}": ${typedError.message}`)
  }

  let size = 0n
  const queue: string[] = [path]

  const childLogger = logger.child({ path })

  const processQueue = async (): Promise<void> => {
    while (queue.length > 0) {
      const currentPath = queue.shift()!
      let entries: Dirent[]

      try {
        entries = await fs.readdir(currentPath, { withFileTypes: true })
      } catch (err) {
        const typedError = err as NodeJS.ErrnoException
        childLogger.warn(`Failed to read directory`, {
          cause: typedError.message,
        })
        continue
      }

      // Process entries in batches to limit concurrent fs.stat calls
      const batchSize = Math.max(1, Math.floor(concurrency / 4))
      for (let i = 0; i < entries.length; i += batchSize) {
        const batch = entries.slice(i, i + batchSize)

        const results = await Promise.allSettled(
          batch.map(async (entry) => {
            const fullPath = join(currentPath, entry.name)
            const stats = await fs.stat(fullPath, { bigint: true })

            if (stats.isFile()) {
              return { type: 'file', size: stats.size }
            } else if (stats.isDirectory()) {
              return { type: 'directory', path: fullPath }
            }
            return { type: 'other' }
          }),
        )

        // Process results
        results.forEach((result) => {
          if (result.status === 'fulfilled') {
            const value = result.value
            if (value.type === 'file') {
              size += value?.size ?? 0n
            } else if (value.type === 'directory') {
              queue.push(value?.path ?? '')
            }
          } else {
            childLogger.warn(`Failed to process entry`, {
              cause:
                result.reason instanceof Error
                  ? result.reason.message
                  : String(result.reason),
            })
          }
        })
      }
    }
  }

  const workers = Math.min(Math.max(1, concurrency), 16)
  const workerPromises = Array.from({ length: workers }, () => processQueue())

  await Promise.allSettled(workerPromises)

  if (humanReadable) {
    return convertSizeToReadableUnit(size)
  }

  return size
}
