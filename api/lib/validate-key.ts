export function validateApiKey(key: string): boolean {
  return key.startsWith('sk-ant-') && key.length >= 40
}
