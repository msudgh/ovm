export const isTestEnv = () => {
  return process.env.NODE_ENV === 'test' || process.env.CI === 'true'
}
