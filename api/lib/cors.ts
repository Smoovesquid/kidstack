const ALLOWED_ORIGINS = [
  'https://kidstack.vercel.app',
  'http://localhost:5173',
  'http://localhost:3002',
]

export const CORS_VARY_HEADERS = {
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
}

export function getAllowedOrigin(requestOrigin: string | undefined): string | null {
  if (!requestOrigin) return null
  return ALLOWED_ORIGINS.includes(requestOrigin) ? requestOrigin : null
}
