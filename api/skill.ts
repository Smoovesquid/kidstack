/**
 * Extracted skill execution endpoint.
 * Proof-of-concept: gstack skill intelligence via Anthropic Messages API.
 *
 * POST /api/skill
 * Body: { skill: "office-hours", messages: [...], apiKey?: string }
 * Response: SSE stream matching the KidStack event schema.
 */
import Anthropic from '@anthropic-ai/sdk'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { OFFICE_HOURS_SYSTEM, OFFICE_HOURS_PHASES } from './prompts/office-hours'
import { OFFICE_HOURS_KID_SYSTEM, OFFICE_HOURS_KID_PHASES } from './prompts/office-hours-kid'
import { PLAN_CEO_REVIEW_SYSTEM, PLAN_CEO_REVIEW_PHASES } from './prompts/plan-ceo-review'
import { PLAN_CEO_REVIEW_KID_SYSTEM, PLAN_CEO_REVIEW_KID_PHASES } from './prompts/plan-ceo-review-kid'
import { PLAN_ENG_REVIEW_SYSTEM, PLAN_ENG_REVIEW_PHASES } from './prompts/plan-eng-review'
import { PLAN_ENG_REVIEW_KID_SYSTEM, PLAN_ENG_REVIEW_KID_PHASES } from './prompts/plan-eng-review-kid'
import { PLAN_DESIGN_REVIEW_SYSTEM, PLAN_DESIGN_REVIEW_PHASES } from './prompts/plan-design-review'
import { PLAN_DESIGN_REVIEW_KID_SYSTEM, PLAN_DESIGN_REVIEW_KID_PHASES } from './prompts/plan-design-review-kid'
import { DESIGN_CONSULTATION_SYSTEM, DESIGN_CONSULTATION_PHASES } from './prompts/design-consultation'
import { DESIGN_CONSULTATION_KID_SYSTEM, DESIGN_CONSULTATION_KID_PHASES } from './prompts/design-consultation-kid'
import { DESIGN_SHOTGUN_SYSTEM, DESIGN_SHOTGUN_PHASES } from './prompts/design-shotgun'
import { DESIGN_SHOTGUN_KID_SYSTEM, DESIGN_SHOTGUN_KID_PHASES } from './prompts/design-shotgun-kid'
import { checkRateLimit } from './lib/rate-limit'
import { validateApiKey } from './lib/validate-key'
import { getAllowedOrigin, CORS_VARY_HEADERS } from './lib/cors'

export const config = { maxDuration: 60 }

// Skill registry — add more extracted prompts here
const SKILLS: Record<string, { system: string; phases: readonly any[]; model: string; maxTokens: number }> = {
  'office-hours': {
    system: OFFICE_HOURS_SYSTEM,
    phases: OFFICE_HOURS_PHASES,
    model: 'claude-haiku-4-5-20251001',
    maxTokens: 2048,
  },
  'office-hours-kid': {
    system: OFFICE_HOURS_KID_SYSTEM,
    phases: OFFICE_HOURS_KID_PHASES,
    model: 'claude-haiku-4-5-20251001',
    maxTokens: 2048,
  },
  'plan-ceo-review': {
    system: PLAN_CEO_REVIEW_SYSTEM,
    phases: PLAN_CEO_REVIEW_PHASES,
    model: 'claude-haiku-4-5-20251001',
    maxTokens: 2048,
  },
  'plan-ceo-review-kid': {
    system: PLAN_CEO_REVIEW_KID_SYSTEM,
    phases: PLAN_CEO_REVIEW_KID_PHASES,
    model: 'claude-haiku-4-5-20251001',
    maxTokens: 2048,
  },
  'plan-eng-review': {
    system: PLAN_ENG_REVIEW_SYSTEM,
    phases: PLAN_ENG_REVIEW_PHASES,
    model: 'claude-haiku-4-5-20251001',
    maxTokens: 2048,
  },
  'plan-eng-review-kid': {
    system: PLAN_ENG_REVIEW_KID_SYSTEM,
    phases: PLAN_ENG_REVIEW_KID_PHASES,
    model: 'claude-haiku-4-5-20251001',
    maxTokens: 2048,
  },
  'plan-design-review': {
    system: PLAN_DESIGN_REVIEW_SYSTEM,
    phases: PLAN_DESIGN_REVIEW_PHASES,
    model: 'claude-haiku-4-5-20251001',
    maxTokens: 2048,
  },
  'plan-design-review-kid': {
    system: PLAN_DESIGN_REVIEW_KID_SYSTEM,
    phases: PLAN_DESIGN_REVIEW_KID_PHASES,
    model: 'claude-haiku-4-5-20251001',
    maxTokens: 2048,
  },
  'design-consultation': {
    system: DESIGN_CONSULTATION_SYSTEM,
    phases: DESIGN_CONSULTATION_PHASES,
    model: 'claude-haiku-4-5-20251001',
    maxTokens: 2048,
  },
  'design-consultation-kid': {
    system: DESIGN_CONSULTATION_KID_SYSTEM,
    phases: DESIGN_CONSULTATION_KID_PHASES,
    model: 'claude-haiku-4-5-20251001',
    maxTokens: 2048,
  },
  'design-shotgun': {
    system: DESIGN_SHOTGUN_SYSTEM,
    phases: DESIGN_SHOTGUN_PHASES,
    model: 'claude-haiku-4-5-20251001',
    maxTokens: 2048,
  },
  'design-shotgun-kid': {
    system: DESIGN_SHOTGUN_KID_SYSTEM,
    phases: DESIGN_SHOTGUN_KID_PHASES,
    model: 'claude-haiku-4-5-20251001',
    maxTokens: 2048,
  },
}

interface SkillRequest {
  skill: string
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  apiKey?: string
}

function sendSSE(res: VercelResponse, data: object) {
  res.write(`data: ${JSON.stringify(data)}\n\n`)
}

function sendSSEError(res: VercelResponse, code: string, message: string) {
  res.write(`event: error\ndata: ${JSON.stringify({ code, message })}\n\n`)
}

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

  // Rate limiting
  const rawForwarded = req.headers['x-forwarded-for']
  const ip = (Array.isArray(rawForwarded) ? rawForwarded[0] : rawForwarded)
    ?? req.socket?.remoteAddress
    ?? 'unknown'
  const { allowed, retryAfter } = checkRateLimit(ip)
  if (!allowed) {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.status(429)
    sendSSEError(res, 'RATE_LIMITED', `Too many requests. Try again in ${retryAfter} seconds.`)
    res.end()
    return
  }

  const body = req.body as SkillRequest
  if (!body?.skill || !body?.messages?.length) {
    res.status(400).json({ error: 'Missing skill or messages' })
    return
  }

  const skillConfig = SKILLS[body.skill]
  if (!skillConfig) {
    res.status(400).json({ error: `Unknown skill: ${body.skill}`, available: Object.keys(SKILLS) })
    return
  }

  // BYOK: prefer header, then body, then env
  const headerKey = Array.isArray(req.headers['x-api-key'])
    ? req.headers['x-api-key'][0]
    : req.headers['x-api-key']
  const apiKey = headerKey ?? body.apiKey ?? process.env.ANTHROPIC_API_KEY

  // API key validation
  if (!apiKey || !validateApiKey(apiKey)) {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.status(400)
    sendSSEError(res, 'INVALID_KEY', 'Invalid API key format. Keys start with sk-ant- and are at least 40 characters.')
    res.end()
    return
  }

  const client = new Anthropic({ apiKey, timeout: 55_000 })

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')

  // Send skill metadata first
  sendSSE(res, { type: 'skill_meta', skill: body.skill, phases: skillConfig.phases })

  let inputTokens = 0
  let outputTokens = 0

  try {
    const stream = client.messages.stream({
      model: skillConfig.model,
      max_tokens: skillConfig.maxTokens,
      system: skillConfig.system,
      messages: body.messages,
    })

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        sendSSE(res, { type: 'text', content: event.delta.text })
      }
      if (event.type === 'message_delta' && event.usage) {
        outputTokens = event.usage.output_tokens
      }
    }

    // Get final usage
    const finalMessage = await stream.finalMessage()
    inputTokens = finalMessage.usage.input_tokens
    outputTokens = finalMessage.usage.output_tokens

    // Token usage event (feeds cost meter)
    sendSSE(res, {
      type: 'tokens',
      input: inputTokens,
      output: outputTokens,
      model: skillConfig.model,
    })

    sendSSE(res, { type: 'done' })
  } catch (err) {
    const status = err instanceof Error && 'status' in err ? (err as { status: number }).status : 0

    if (err instanceof Anthropic.APIConnectionTimeoutError) {
      sendSSEError(res, 'TIMEOUT', 'Request timed out. Try a shorter message.')
    } else if (status === 401) {
      sendSSEError(res, 'AUTH_FAILED', 'API key rejected by Anthropic. Check your key at console.anthropic.com')
    } else if (status === 429 || status === 529) {
      sendSSEError(res, 'API_ERROR', 'Anthropic API error: service overloaded, try again in a moment.')
    } else if (status >= 400) {
      const message = err instanceof Error ? err.message : 'unknown error'
      sendSSEError(res, 'API_ERROR', `Anthropic API error: ${message}`)
    } else {
      console.error('[skill] stream error:', err)
      sendSSEError(res, 'UNKNOWN', 'Something went wrong. Try again.')
    }
  }

  res.end()
}
