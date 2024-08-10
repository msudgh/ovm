import { expect } from 'chai'
import { existsSync } from 'fs'
import { destroyConfigMockFile, getTmpConfigFilePath, runCommand } from '../../utils/testing'

describe('Command: config init', () => {
  beforeEach(async () => {
    const tmpConfigFilePath = getTmpConfigFilePath()
    if (tmpConfigFilePath && existsSync(tmpConfigFilePath)) {
      await destroyConfigMockFile(tmpConfigFilePath)
    }
  })

  it('should create a config file', async () => {
    const tmpConfigFilePath = getTmpConfigFilePath()
    const result = await runCommand(`config init -c ${tmpConfigFilePath}`)
    expect(result?.stdout?.trim()).to.equal(
      `info: Config file created {"path":"${tmpConfigFilePath}"}`,
    )
    await destroyConfigMockFile(tmpConfigFilePath)
  })
  it('should not create a config file if already exists', async () => {
    const tmpConfigFilePath = getTmpConfigFilePath()
    await runCommand(`config init -c ${tmpConfigFilePath}`)

    try {
      await runCommand(`config init -c ${tmpConfigFilePath}`)
    } catch (error) {
      expect((error as Error).message.trim()).to.match(
        /Error: File already exists!/,
      )

      await destroyConfigMockFile(tmpConfigFilePath)
    }
  })
})
