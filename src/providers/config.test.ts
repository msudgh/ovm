import { ConfigSchema, safeLoadConfig } from './config'

import { expect } from 'chai'
import mock from 'mock-fs'
import { OVM_CONFIG_FILENAME } from '../utils/constants'

describe('Config', () => {
  it("should load config from user's home dir", async () => {
    const userHome = '/home/user'
    const configPath = `${userHome}/${OVM_CONFIG_FILENAME}`

    const sampleDefaultConfig = ConfigSchema.parse({})

    mock({
      [userHome]: {
        [OVM_CONFIG_FILENAME]: JSON.stringify(sampleDefaultConfig),
      },
    })

    const config = await safeLoadConfig(configPath)

    expect(config.success).to.be.true.equal(true)
    expect(config.error).to.be.undefined.equal(undefined)
    expect(config.data).to.deep.equal(sampleDefaultConfig)
    mock.restore()
  })

  it('should throw an error if the config file is invalid', async () => {
    const userHome = '/home/user'
    const configPath = `${userHome}/${OVM_CONFIG_FILENAME}`
    mock({
      [userHome]: {
        [OVM_CONFIG_FILENAME]: 'invalid-json',
      },
    })

    try {
      const { error } = await safeLoadConfig(configPath)
      throw error
    } catch (error) {
      expect(error).to.be.an('error')
    }
  })
})
