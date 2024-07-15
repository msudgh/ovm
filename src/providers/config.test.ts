import * as sinon from 'sinon'
import {loadConfig} from './config'

import {expect} from 'chai'
import fs, {readFileSync} from 'fs'
import mock from 'mock-fs'
import {OVM_CONFIG_FILENAME} from '../constants'

describe('Config', () => {
  it("should setup config in user's homedir by creating generating the file", async () => {
    const userHome = '/home/user'
    const configPath = `${userHome}/${OVM_CONFIG_FILENAME}`
    mock({
      [userHome]: {},
    })
    const writeStub = sinon.stub(fs, 'writeFileSync')
    const config = await loadConfig(configPath)

    expect(writeStub.calledOnce).to.be.true
    expect(writeStub.firstCall.args[0]).to.equal(configPath)

    mock({
      [userHome]: {
        [OVM_CONFIG_FILENAME]: JSON.stringify(config),
      },
    })

    const createdFile = JSON.parse(readFileSync(configPath).toString())
    expect(createdFile).to.deep.equal({plugins: []})
    writeStub.restore()
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
      await loadConfig(configPath)
    } catch (error) {
      expect(error).to.be.an('error')
    }
  })
})
