import { exec, ExecException } from 'child_process'
import { rm } from 'fs/promises'
import { tmpdir } from 'os'
import path from 'path'
import { OVM_CONFIG_FILENAME } from './constants'

type CommandResult = {
  stdout: string
  stderr: string
}

export const runCommand = async (
  command: string,
  dev = false,
): Promise<CommandResult | (ExecException | null)> => {
  const formattedCommand = `./bin/${dev ? 'dev' : 'run'}.js ${command}`
  return new Promise((resolve, reject) => {
    exec(formattedCommand, (error, stdout, stderr) => {
      if (error) {
        reject(error)
      }
      resolve({ stdout, stderr })
    })
  })
}

export const getTmpConfigFilePath = () => {
  return path.join(tmpdir(), OVM_CONFIG_FILENAME)
}


export const destroyConfigMockFile = async (path: string) => {
  await rm(path, { force: true })
}
