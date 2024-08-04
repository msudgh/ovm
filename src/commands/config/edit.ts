import { flush } from '@oclif/core'
import { ArgInput } from '@oclif/core/lib/parser'
import { exec } from 'child_process'
import FactoryCommand, {
  CommonFlags,
  FactoryFlags,
} from '../../providers/command'
import { safeLoadConfig } from '../../providers/config'
import { logger } from '../../utils/logger'

const getDefaultEditorCommandByOS = (filePath: string): string => {
  switch (process.platform) {
    case 'win32':
      return `notepad ${filePath}`
    case 'darwin':
      return `open -e ${filePath}`
    case 'linux':
      return `xdg-open ${filePath}`
    default:
      throw new Error('Unsupported OS')
  }
}

const openTextEditor = (filePath: string): Promise<boolean | Error> => {
  const command = getDefaultEditorCommandByOS(filePath)
  const childLogger = logger.child({ filePath, command })

  childLogger.debug('Editing config file')

  return new Promise((resolve, reject) => {
    const editorProcess = exec(command, (error, stdout, stderr) => {
      if (error) {
        childLogger.error(`Error opening editor`, { error })
        reject(error)
      }
    })

    editorProcess.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Command failed with code ${code}`))
      }
      resolve(true)
    })
  })
}

/**
 * Edit ovm config file.
 */
export default class Edit extends FactoryCommand {
  static readonly aliases = ['ce', 'config:edit']
  static override readonly description = `Edit ovm config file.`
  static override readonly examples = ['<%= config.bin %> <%= command.id %>']
  static override readonly flags = {
    ...this.commonFlags,
  }

  /**
   * Executes the command.
   * Parses the arguments and flags, and calls the action method.
   * Handles errors and ensures flushing of logs.
   */
  public async run() {
    try {
      const { args, flags } = await this.parse(Edit)
      await this.action(args, this.flagsInterceptor(flags))
    } catch (error) {
      this.handleError(error)
    } finally {
      flush()
    }
  }

  /**
   * Main action method for the command.
   * @param {ArgInput} args - The arguments passed to the command.
   * @param {FactoryFlags<InitFlags>} flags - The flags passed to the command.
   * @returns {Promise<void>}
   */
  private async action(
    args: ArgInput,
    flags: FactoryFlags<CommonFlags>,
  ): Promise<void> {
    const { data: config, error } = await safeLoadConfig(flags.config)

    if (config) {
      const isOpen = await openTextEditor(flags.config)

      if (isOpen) {
        this.log(
          `Config file opened in text editor and enjoy editing!\nAfter you are done, save and close the editor to continue with a new command.`,
        )
      }
    }

    if (error) {
      throw error
    }
  }
}
