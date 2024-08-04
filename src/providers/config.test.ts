import { ConfigSchema, safeLoadConfig } from './config'

import { expect } from 'chai'
import mock from 'mock-fs'
import { OVM_CONFIG_FILENAME } from '../constants'

describe('Config', () => {
  it("should load config from user's home dir", async () => {
    const userHome = '/home/user'
    const configPath = `${userHome}/${OVM_CONFIG_FILENAME}`

    const defaultConfig = ConfigSchema.parse({})

    mock({
      [userHome]: {
        [OVM_CONFIG_FILENAME]: JSON.stringify(defaultConfig),
      },
    })

    const config = await safeLoadConfig(configPath)

    expect(config.success).to.be.true
    expect(config.data).to.deep.equal(config.data)
    expect(config.error).to.be.undefined
    expect(config.data).to.have.property('plugins')
    expect(config.data).to.have.property('hotkeys')
    expect(config.data).to.deep.equal(defaultConfig)
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
