import { expect } from 'chai'
import { existsSync } from 'fs'
import { destroyConfigMockFile, getTmpConfigFilePath, runCommand } from '../../utils/testing'

describe('Command: config init', () => {
  beforeEach(async () => {
    const tmpConfigFilePath = getTmpConfigFilePath()
    if (tmpConfigFilePath && existsSync(tmpConfigFilePath)) {
      await destroyConfigMockFile(tmpConfigFilePath.normalize('NFC'))
    }
  })

  it('should create a config file', async () => {
    const tmpConfigFilePath = getTmpConfigFilePath()
    const result = await runCommand(`config init -c ${tmpConfigFilePath}`)
    const normalizedOutput = result?.stdout?.trim().replace(/\\\\/g, '\\')
    expect(normalizedOutput).to.equal(
      `info: Config file created {"path":"${tmpConfigFilePath.replace(/\\\\/g, '\\')}"}`,
    )
    await destroyConfigMockFile(tmpConfigFilePath.normalize('NFC'))
  })
})
