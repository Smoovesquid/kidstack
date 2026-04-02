/**
 * POST /api/test-key
 * Validates an Anthropic API key by making a minimal Haiku call.
 * Returns { success: true } or { success: false, error: 'invalid_key' | 'no_credits' | 'network_error' }
 */
import Anthropic from '@anthropic-ai/sdk'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { validateApiKey } from './lib/validate-key'
import { getAllowedOrigin, CORS_VARY_HEADERS } from './lib/cors'

export const config = { maxDuration: 15 }

function applyCors(req: VercelRequest, res: VercelResponse) {
  const raw = req.headers['origin']
  const origin = Array.isArray(raw) ? raw[0] : raw
  const allowed = getAllowedOrigin(origin)
  if (allowed) {
    res.setHeader('Access-Control-Allow-Origin', allowed)
    res.setHeader('Access-Control-Allow-Methods', CORS_VARY_HEADERS['Access-Control-Allow-Methods'])
    res.setHeader('Access-Control-Allow-Headers', CORS_VARY_HEADERS['Access-Control-Allow-Headers'])
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(req, res)

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const headerKey = Array.isArray(req.headers['x-api-key'])
    ? req.headers['x-api-key'][0]
    : req.headers['x-api-key']

  if (!headerKey || !validateApiKey(headerKey)) {
    res.status(400).json({ success: false, error: 'invalid_key' })
    return
  }

  try {
    const client = new Anthropic({ apiKey: headerKey, timeout: 10_000 })
    await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 5,
      messages: [{ role: 'user', content: 'Hi' }],
    })
    res.status(200).json({ success: true })
  } catch (err) {
    const status = err instanceof Error && 'status' in err ? (err as { status: number }).status : 0

    if (status === 401) {
      res.status(200).json({ success: false, error: 'invalid_key' })
    } else if (status === 400 && err instanceof Error && err.message.includes('credit')) {
      res.status(200).json({ success: false, error: 'no_credits' })
    } else if (status === 429 || status === 529) {
      // Overloaded but key is valid — treat as success for onboarding purposes
      res.status(200).json({ success: true })
    } else if (err instanceof Anthropic.APIConnectionError || err instanceof Anthropic.APIConnectionTimeoutError) {
      res.status(200).json({ success: false, error: 'network_error' })
    } else if (status >= 400) {
      const message = err instanceof Error ? err.message : ''
      if (message.toLowerCase().includes('credit') || message.toLowerCase().includes('billing')) {
        res.status(200).json({ success: false, error: 'no_credits' })
      } else {
        res.status(200).json({ success: false, error: 'invalid_key' })
      }
    } else {
      res.status(200).json({ success: false, error: 'network_error' })
    }
  }
}
