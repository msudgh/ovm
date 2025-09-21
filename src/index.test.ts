import { execFile } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { promisify } from 'node:util'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { destroyVault, normalizeHelpOutput, setupVault } from './utils/testing'

describe('ovm CLI', () => {
  const originalEnv = { ...process.env }
  const execFileAsync = promisify(execFile)
  const __dirname = dirname(__filename)
  const OVM_BINARY_PATH = resolve(__dirname, '../bin/run.js')

  beforeAll(() => {
    process.env.NO_COLOR = '1'
    process.env.FORCE_COLOR = '0'
    process.env.COLUMNS = '80'
    process.env.TZ = 'UTC'
    process.env.LANG = 'C'
  })

  afterAll(() => {
    process.env = originalEnv
  })

  describe('help', () => {
    it('prints top-level', async () => {
      const { stdout, stderr } = await execFileAsync('node', [
        OVM_BINARY_PATH,
        '--help',
      ])

      expect(stderr).toBe('')

      const normalizedStdout = normalizeHelpOutput(stdout)

      expect(normalizedStdout).toMatchSnapshot()
    }, 30000)

    it('prints for a topic', async () => {
      const { stdout, stderr } = await execFileAsync('node', [
        OVM_BINARY_PATH,
        'plugins',
        '--help',
      ])

      const normalizedStdout = normalizeHelpOutput(stdout)

      expect(stderr).toBe('')
      expect(normalizedStdout).toMatchSnapshot()
    })
  })

  describe('reports stats', () => {
    it("returns the vault's statistics with JSON output", async () => {
      const { vault, config } = await setupVault()
      const { stdout, stderr } = await execFileAsync(
        'node',
        [
          OVM_BINARY_PATH,
          'reports',
          'stats',
          '--config',
          config.path,
          '--path',
          vault.path,
          '--output',
          'json',
        ],
        {
          env: { ...process.env },
        },
      )

      expect(stderr).toBe('')

      const parsed = JSON.parse(stdout)

      expect(parsed).toHaveProperty('totalVaults', 1)
      expect(parsed).toHaveProperty('totalPlugins', 0)

      destroyVault(vault.path)
    })
  })
})
