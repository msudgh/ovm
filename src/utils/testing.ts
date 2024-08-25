import { exec, ExecException } from 'child_process'
import { rm } from 'fs/promises'
import { platform, tmpdir } from 'os'
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
  return new Promise((resolve, reject) => {
    const detectedPlatform = platform()
    const runnerExt = detectedPlatform === 'win32' ? 'cmd' : 'js'
    const runnerType = dev ? 'dev' : 'run'
    const runnerFilePath = `${runnerType}.${runnerExt}`
    const formattedCommand =
      detectedPlatform === 'win32'
        ? path.win32.normalize(
            path.join(
              __dirname,
              '..',
              '..',
              `bin/${runnerFilePath} ${command}`,
            ),
          )
        : `./bin/${runnerFilePath} ${command}`
    exec(formattedCommand, (error, stdout, stderr) => {
      if (error) {
        reject(error)
      }
      resolve({ stdout, stderr })
    })
  })
}

export const getTmpConfigFilePath = () => {
  if (platform() === 'win32') {
    return path.win32.join(tmpdir(), OVM_CONFIG_FILENAME)
  }

  return path.join(tmpdir(), OVM_CONFIG_FILENAME)
}

export const destroyConfigMockFile = async (path: string) => {
  return await rm(path, { force: true })
}
