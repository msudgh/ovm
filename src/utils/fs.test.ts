import { existsSync } from 'fs'
import fse from 'fs-extra'
import fsp from 'fs/promises'
import { tmpdir } from 'os'
import path from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { convertSizeToReadableUnit, getFileSize } from './fs'

describe('File System Utilities', () => {
  describe('getFileSize', () => {
    let tempDir: string

    beforeEach(async () => {
      tempDir = await fsp.mkdtemp(path.join(tmpdir(), 'ovm-file-test'))
    })

    afterEach(async () => {
      if (tempDir && existsSync(tempDir)) {
        fse.removeSync(tempDir)
      }
    })

    it('should return 0 for an empty directory', async () => {
      const size = await getFileSize(tempDir, 1)
      expect(size).toBe(0n)
    })

    it('should calculate size of files in a directory', async () => {
      const filePath = path.join(tempDir, 'test.txt')
      await fse.writeFile(filePath, 'hello world') // 11 bytes
      const size = await getFileSize(tempDir, 1)
      expect(size).toBe(11n)
    })

    it('should calculate size recursively including subdirectories', async () => {
      const subDir = path.join(tempDir, 'subdir')
      await fse.mkdir(subDir)
      const file1 = path.join(tempDir, 'file1.txt')
      const file2 = path.join(subDir, 'file2.txt')
      await fse.writeFile(file1, 'abc') // 3 bytes
      await fse.writeFile(file2, 'defghi') // 6 bytes
      const size = await getFileSize(tempDir, 1)
      expect(size).toBe(9n)
    })

    it('should throw error for non-existent path', async () => {
      const nonExistent = '/nonexistent/path'
      await expect(getFileSize(nonExistent, 1)).rejects.toThrow(
        'does not exist',
      )
    })

    it('should throw error for path that is a file', async () => {
      const filePath = path.join(tempDir, 'file.txt')
      await fse.writeFile(filePath, 'content')
      await expect(getFileSize(filePath, 1)).rejects.toThrow(
        'is not a directory',
      )
    })

    it('should return human-readable size for a given directory', async () => {
      const result = await getFileSize(tempDir, 1, true)
      expect(result).toEqual('0 B')
    })
  })

  describe('convertSizeToReadableUnit', () => {
    it.each([
      { value: 0, expectedValue: '0 B' },
      { value: 1024n, expectedValue: '1.00 KB' },
      { value: 1048576n, expectedValue: '1.00 MB' },
      { value: 1073741824n, expectedValue: '1.00 GB' },
    ])(
      'should convert $value bytes to $expectedValue',
      ({ value, expectedValue }) => {
        const result = convertSizeToReadableUnit(value)
        expect(result).toBe(expectedValue)
      },
    )
  })
})
