import { realpathSync } from 'fs'
import { tmpdir } from 'os'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as commandUtils from '../../utils/command'
import {
  destroyVault,
  getTestCommonWithVaultPathFlags,
  setupVault,
} from '../../utils/testing'
import { runCommandVaultIterator } from './run'

describe('Command: run', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should fail with invalid command', async () => {
    const { vault, config } = await setupVault()
    const result = await runCommandVaultIterator({
      vault,
      config,
      flags: {
        ...getTestCommonWithVaultPathFlags(config.path, vault.path),
        output: 'json',
      },
      args: {
        command: '',
      },
    })

    expect(result.success).to.be.false
    expect(result.error).to.be.instanceOf(Error)
    destroyVault(vault.path)
  })

  it('should echo path and name of vault by echo command and reserved placeholder {0} {1}', async () => {
    const { vault, config } = await setupVault()
    const result = await runCommandVaultIterator({
      vault,
      config,
      flags: {
        ...getTestCommonWithVaultPathFlags(config.path, vault.path),
      },
      args: { command: 'echo Path: {0} {1}' },
    })

    expect(result?.success).to.be.true

    const expected = `Path: ${vault.path} ${vault.name}`
    expect(result.stdout?.toString().trim()).to.contain(`Path: ${vault.path}`)
    expect(result.stdout?.toString().trim()).to.contain(vault.name)
    expect(result.stdout?.toString().trim()).to.equal(expected)
    destroyVault(vault.path)
  })

  it('should echo path and name of vault by echo command and reserved placeholder {0} {1} and not {10000}', async () => {
    const { vault, config } = await setupVault()
    const result = await runCommandVaultIterator({
      vault,
      config,
      flags: {
        ...getTestCommonWithVaultPathFlags(config.path, vault.path),
      },
      args: { command: 'echo Path: {0} {1} {10000}' },
    })

    expect(result.success).to.be.true

    const expected = `Path: ${vault.path} ${vault.name} {10000}`
    expect(result.stdout?.toString().trim()).to.equal(expected)

    destroyVault(vault.path)
  })

  it('should handle asyncExecCustomCommand rejection', async () => {
    const asyncExecCustomCommandSpy = vi
      .spyOn(commandUtils, 'asyncExecCustomCommand')
      .mockRejectedValue(new Error('Execution failed'))

    const { vault, config } = await setupVault()
    const result = await runCommandVaultIterator({
      vault,
      config,
      flags: {
        ...getTestCommonWithVaultPathFlags(config.path, vault.path),
      },
      args: { command: 'invalid-command' },
    })

    expect(asyncExecCustomCommandSpy.mock.calls).to.have.lengthOf(1)
    expect(result.success).to.be.false
    expect(result.error).to.be.instanceOf(Error)
    expect((result.error as Error).message).to.equal('Execution failed')

    asyncExecCustomCommandSpy.mockRestore()
    destroyVault(vault.path)
  })

  it('should not run command from vault directory', async () => {
    const { vault, config } = await setupVault()
    const result = await runCommandVaultIterator({
      vault,
      config,
      flags: {
        ...getTestCommonWithVaultPathFlags(config.path, vault.path),
        cwd: tmpdir(),
      },
      args: { command: process.platform === 'win32' ? 'cd' : 'pwd' },
    })

    expect(result.success).to.be.true
    expect(result.stdout?.toString().trim()).to.equal(realpathSync(tmpdir()))

    destroyVault(vault.path)
  })

  it('should run command from vault directory', async () => {
    const { vault, config } = await setupVault()
    const result = await runCommandVaultIterator({
      vault,
      config,
      flags: {
        ...getTestCommonWithVaultPathFlags(config.path, vault.path),
      },
      args: { command: process.platform === 'win32' ? 'cd' : 'pwd' },
    })

    expect(result.success).to.be.true
    expect(result.stdout?.toString().trim()).to.equal(realpathSync(vault.path))

    destroyVault(vault.path)
  })
})
