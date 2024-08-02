export class PluginNotFoundInRegistryError extends Error {
  constructor(pluginId: string) {
    super(`Plugin not found in registry: ${pluginId}`)
    this.name = 'PluginNotFoundInRegistryError'
  }
}
