import fs from 'fs'
import path from 'path'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { ConfigSchema } from '../services/config'
import { logger } from '../utils/logger'

const main = async () => {
  const jsonSchema = zodToJsonSchema(ConfigSchema, 'ConfigSchema')
  const filePath = path.join(__dirname, '../schemas/ovm.schema.json')

  await fs.promises.writeFile(filePath, JSON.stringify(jsonSchema, null, 2))

  logger.info('Config JSON schema generated', { path: filePath })
}

main()
