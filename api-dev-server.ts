/**
 * Minimal local dev server for KidStack API
 * Replaces vercel dev for local testing on port 3002.
 * Run with: bun api-dev-server.ts
 */

import Anthropic from '@anthropic-ai/sdk'
import { checkRateLimit } from './api/lib/rate-limit'
import { validateApiKey } from './api/lib/validate-key'
import { getAllowedOrigin, CORS_VARY_HEADERS } from './api/lib/cors'

const PORT = 3002

type Role = 'dream' | 'build' | 'check' | 'show'

const SYSTEM_PROMPTS: Record<Role, string> = {
  dream: `You are a friendly helper for kids who want to make their own apps. Your job is to help them figure out WHAT to make and WHO it's for. Ask short, fun questions. Use simple words. No jargon. Be enthusiastic and encouraging!

When you have enough information to write a plan, write it in EXACTLY this format and nothing else:
NAME: [app name]
FOR: [who it helps]
DOES: [3 things it does, separated by commas]
LOOKS LIKE: [simple description of what the screen looks like]

If you need more information first, ask ONE short, fun question. Never ask more than one question at a time.`,

  build: `You are a coding helper for kids. You turn app plans into real working apps.

CRITICAL RULES:
1. Output ONLY valid HTML. No markdown. No code fences. No explanation text.
2. The FIRST character of your response MUST be the < character.
3. All CSS must be inline in a <style> tag. All JavaScript must be inline in a <script> tag.
4. The app must be self-contained — no external URLs, CDN links, or imports.
5. The app MUST have at least one interactive element (button, input, or clickable element).
6. Make it colorful, fun, and visually appealing for kids aged 7-12.
7. Use bright colors, large text, and simple layouts.
8. Keep the code simple — no build tools, no frameworks, just HTML+CSS+JS.`,

  check: `You are a friendly app tester for kids. You look at app code and give helpful feedback.

Look at the HTML code and give the kid EXACTLY 3 pieces of feedback:
1. ⭐ One thing that works GREAT (be specific and enthusiastic!)
2. 💡 One thing that could be even BETTER (suggest a specific small change)
3. 🚀 One FUN thing to try adding next (a cool feature idea)

Rules:
- Use short, simple sentences
- Be encouraging and positive
- No jargon or technical terms
- Never say "code" or "HTML" — say "your app" instead
- Each bullet should be 1-2 sentences max`,

  show: `You are helping a kid share their app with the world. Write a short, exciting description of their app.

Rules:
- Write EXACTLY 2-3 sentences
- Start with "This app..."
- Use simple, exciting words that would make another kid want to try it
- No technical terms
- Be enthusiastic!`,
}

function stripMarkdownFences(text: string): string {
  const trimmed = text.trim()
  const fenceMatch = trimmed.match(/^```(?:html)?\s*\n?([\s\S]*?)\n?```\s*$/)
  if (fenceMatch) return fenceMatch[1].trim()
  return trimmed
}

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? undefined
  const allowed = getAllowedOrigin(origin)
  if (!allowed) return { ...CORS_VARY_HEADERS }
  return {
    'Access-Control-Allow-Origin': allowed,
    ...CORS_VARY_HEADERS,
    'Access-Control-Allow-Credentials': 'true',
  }
}

function sseError(controller: ReadableStreamDefaultController, code: string, message: string) {
  const text = `event: error\ndata: ${JSON.stringify({ code, message })}\n\n`
  controller.enqueue(new TextEncoder().encode(text))
}

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url)
    const corsHeaders = getCorsHeaders(req)

    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders })
    }

    if (url.pathname === '/api/ping') {
      return new Response(JSON.stringify({ ok: true, warmed: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Set-Cookie': 'ks_session=dev; Path=/; SameSite=Strict; Max-Age=86400' },
      })
    }

    if (url.pathname === '/api/chat' && req.method === 'POST') {
      const ip = req.headers.get('x-forwarded-for') ?? '127.0.0.1'
      const { allowed, retryAfter } = checkRateLimit(ip)
      if (!allowed) {
        const stream = new ReadableStream({
          start(controller) {
            sseError(controller, 'RATE_LIMITED', `Too many requests. Try again in ${retryAfter} seconds.`)
            controller.close()
          },
        })
        return new Response(stream, {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
        })
      }

      const apiKey = req.headers.get('x-api-key') ?? process.env.ANTHROPIC_API_KEY ?? ''
      if (!apiKey || !validateApiKey(apiKey)) {
        const stream = new ReadableStream({
          start(controller) {
            sseError(controller, 'INVALID_KEY', 'Invalid API key format. Keys start with sk-ant- and are at least 40 characters.')
            controller.close()
          },
        })
        return new Response(stream, {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
        })
      }

      const body = await req.json() as { role: Role; messages: Array<{ role: string; content: string }> }
      const { role, messages } = body

      if (!role || !messages?.length) {
        return new Response(JSON.stringify({ error: 'Missing role or messages' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const systemPrompt = SYSTEM_PROMPTS[role]
      if (!systemPrompt) {
        return new Response(JSON.stringify({ error: 'Invalid role' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const client = new Anthropic({ apiKey, timeout: 55_000 })

      const stream = new ReadableStream({
        async start(controller) {
          const encode = (data: object) => {
            const text = `data: ${JSON.stringify(data)}\n\n`
            controller.enqueue(new TextEncoder().encode(text))
          }

          try {
            let fullText = ''
            const anthropicStream = client.messages.stream({
              model: 'claude-haiku-4-5-20251001',
              max_tokens: role === 'build' ? 4096 : 1024,
              system: systemPrompt,
              messages: messages as Array<{ role: 'user' | 'assistant'; content: string }>,
            })

            for await (const event of anthropicStream) {
              if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
                fullText += event.delta.text
                encode({ type: 'delta', text: event.delta.text })
              }
            }

            if (role === 'build') {
              const cleaned = stripMarkdownFences(fullText)
              encode({ type: 'moderation_passed', html: cleaned })
            } else {
              encode({ type: 'done', remaining: 18 })
            }
          } catch (err) {
            const status = err instanceof Error && 'status' in err ? (err as { status: number }).status : 0
            if (err instanceof Anthropic.APIConnectionTimeoutError) {
              sseError(controller, 'TIMEOUT', 'Request timed out. Try a shorter message.')
            } else if (status === 401) {
              sseError(controller, 'AUTH_FAILED', 'API key rejected by Anthropic. Check your key at console.anthropic.com')
            } else if (status === 429 || status === 529) {
              sseError(controller, 'API_ERROR', 'Anthropic API error: service overloaded, try again in a moment.')
            } else if (status >= 400) {
              const message = err instanceof Error ? err.message : 'unknown error'
              sseError(controller, 'API_ERROR', `Anthropic API error: ${message}`)
            } else {
              console.error('[chat] error:', err)
              sseError(controller, 'UNKNOWN', 'Something went wrong. Try again.')
            }
          }

          controller.close()
        },
      })

      return new Response(stream, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Set-Cookie': 'ks_session=dev; Path=/; SameSite=Strict; Max-Age=86400',
        },
      })
    }

    // --- /api/skill route (extracted gstack skill execution) ---
    if (url.pathname === '/api/skill' && req.method === 'POST') {
      const { OFFICE_HOURS_SYSTEM, OFFICE_HOURS_PHASES } = await import('./api/prompts/office-hours')
      const { OFFICE_HOURS_KID_SYSTEM, OFFICE_HOURS_KID_PHASES } = await import('./api/prompts/office-hours-kid')
      const { PLAN_CEO_REVIEW_SYSTEM, PLAN_CEO_REVIEW_PHASES } = await import('./api/prompts/plan-ceo-review')
      const { PLAN_CEO_REVIEW_KID_SYSTEM, PLAN_CEO_REVIEW_KID_PHASES } = await import('./api/prompts/plan-ceo-review-kid')
      const { PLAN_ENG_REVIEW_SYSTEM, PLAN_ENG_REVIEW_PHASES } = await import('./api/prompts/plan-eng-review')
      const { PLAN_ENG_REVIEW_KID_SYSTEM, PLAN_ENG_REVIEW_KID_PHASES } = await import('./api/prompts/plan-eng-review-kid')
      const { PLAN_DESIGN_REVIEW_SYSTEM, PLAN_DESIGN_REVIEW_PHASES } = await import('./api/prompts/plan-design-review')
      const { PLAN_DESIGN_REVIEW_KID_SYSTEM, PLAN_DESIGN_REVIEW_KID_PHASES } = await import('./api/prompts/plan-design-review-kid')
      const { DESIGN_CONSULTATION_SYSTEM, DESIGN_CONSULTATION_PHASES } = await import('./api/prompts/design-consultation')
      const { DESIGN_CONSULTATION_KID_SYSTEM, DESIGN_CONSULTATION_KID_PHASES } = await import('./api/prompts/design-consultation-kid')
      const { DESIGN_SHOTGUN_SYSTEM, DESIGN_SHOTGUN_PHASES } = await import('./api/prompts/design-shotgun')
      const { DESIGN_SHOTGUN_KID_SYSTEM, DESIGN_SHOTGUN_KID_PHASES } = await import('./api/prompts/design-shotgun-kid')

      const SKILLS: Record<string, { system: string; phases: readonly any[]; model: string; maxTokens: number }> = {
        'office-hours': { system: OFFICE_HOURS_SYSTEM, phases: OFFICE_HOURS_PHASES, model: 'claude-haiku-4-5-20251001', maxTokens: 2048 },
        'office-hours-kid': { system: OFFICE_HOURS_KID_SYSTEM, phases: OFFICE_HOURS_KID_PHASES, model: 'claude-haiku-4-5-20251001', maxTokens: 2048 },
        'plan-ceo-review': { system: PLAN_CEO_REVIEW_SYSTEM, phases: PLAN_CEO_REVIEW_PHASES, model: 'claude-haiku-4-5-20251001', maxTokens: 2048 },
        'plan-ceo-review-kid': { system: PLAN_CEO_REVIEW_KID_SYSTEM, phases: PLAN_CEO_REVIEW_KID_PHASES, model: 'claude-haiku-4-5-20251001', maxTokens: 2048 },
        'plan-eng-review': { system: PLAN_ENG_REVIEW_SYSTEM, phases: PLAN_ENG_REVIEW_PHASES, model: 'claude-haiku-4-5-20251001', maxTokens: 2048 },
        'plan-eng-review-kid': { system: PLAN_ENG_REVIEW_KID_SYSTEM, phases: PLAN_ENG_REVIEW_KID_PHASES, model: 'claude-haiku-4-5-20251001', maxTokens: 2048 },
        'plan-design-review': { system: PLAN_DESIGN_REVIEW_SYSTEM, phases: PLAN_DESIGN_REVIEW_PHASES, model: 'claude-haiku-4-5-20251001', maxTokens: 2048 },
        'plan-design-review-kid': { system: PLAN_DESIGN_REVIEW_KID_SYSTEM, phases: PLAN_DESIGN_REVIEW_KID_PHASES, model: 'claude-haiku-4-5-20251001', maxTokens: 2048 },
        'design-consultation': { system: DESIGN_CONSULTATION_SYSTEM, phases: DESIGN_CONSULTATION_PHASES, model: 'claude-haiku-4-5-20251001', maxTokens: 2048 },
        'design-consultation-kid': { system: DESIGN_CONSULTATION_KID_SYSTEM, phases: DESIGN_CONSULTATION_KID_PHASES, model: 'claude-haiku-4-5-20251001', maxTokens: 2048 },
        'design-shotgun': { system: DESIGN_SHOTGUN_SYSTEM, phases: DESIGN_SHOTGUN_PHASES, model: 'claude-haiku-4-5-20251001', maxTokens: 2048 },
        'design-shotgun-kid': { system: DESIGN_SHOTGUN_KID_SYSTEM, phases: DESIGN_SHOTGUN_KID_PHASES, model: 'claude-haiku-4-5-20251001', maxTokens: 2048 },
      }

      const ip = req.headers.get('x-forwarded-for') ?? '127.0.0.1'
      const { allowed, retryAfter } = checkRateLimit(ip)
      if (!allowed) {
        const stream = new ReadableStream({
          start(controller) {
            sseError(controller, 'RATE_LIMITED', `Too many requests. Try again in ${retryAfter} seconds.`)
            controller.close()
          },
        })
        return new Response(stream, {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
        })
      }

      const apiKey = req.headers.get('x-api-key') ?? process.env.ANTHROPIC_API_KEY ?? ''
      if (!apiKey || !validateApiKey(apiKey)) {
        const stream = new ReadableStream({
          start(controller) {
            sseError(controller, 'INVALID_KEY', 'Invalid API key format. Keys start with sk-ant- and are at least 40 characters.')
            controller.close()
          },
        })
        return new Response(stream, {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
        })
      }

      const body = await req.json() as { skill: string; messages: Array<{ role: string; content: string }> }
      const skillConfig = SKILLS[body.skill]
      if (!skillConfig) {
        return new Response(JSON.stringify({ error: `Unknown skill: ${body.skill}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const client = new Anthropic({ apiKey, timeout: 55_000 })

      const stream = new ReadableStream({
        async start(controller) {
          const encode = (data: object) => {
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`))
          }

          encode({ type: 'skill_meta', skill: body.skill, phases: skillConfig.phases })

          try {
            const anthropicStream = client.messages.stream({
              model: skillConfig.model,
              max_tokens: skillConfig.maxTokens,
              system: skillConfig.system,
              messages: body.messages as Array<{ role: 'user' | 'assistant'; content: string }>,
            })

            for await (const event of anthropicStream) {
              if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
                encode({ type: 'text', content: event.delta.text })
              }
            }

            const finalMessage = await anthropicStream.finalMessage()
            encode({ type: 'tokens', input: finalMessage.usage.input_tokens, output: finalMessage.usage.output_tokens, model: skillConfig.model })
            encode({ type: 'done' })
          } catch (err) {
            const status = err instanceof Error && 'status' in err ? (err as { status: number }).status : 0
            if (err instanceof Anthropic.APIConnectionTimeoutError) {
              sseError(controller, 'TIMEOUT', 'Request timed out. Try a shorter message.')
            } else if (status === 401) {
              sseError(controller, 'AUTH_FAILED', 'API key rejected by Anthropic. Check your key at console.anthropic.com')
            } else if (status === 429 || status === 529) {
              sseError(controller, 'API_ERROR', 'Anthropic API error: service overloaded, try again in a moment.')
            } else if (status >= 400) {
              const message = err instanceof Error ? err.message : 'unknown error'
              sseError(controller, 'API_ERROR', `Anthropic API error: ${message}`)
            } else {
              console.error('[skill] error:', err)
              sseError(controller, 'UNKNOWN', 'Something went wrong. Try again.')
            }
          }

          controller.close()
        },
      })

      return new Response(stream, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    }

    // --- /api/test-key route (BYOK key validation) ---
    if (url.pathname === '/api/test-key' && req.method === 'POST') {
      const apiKey = req.headers.get('x-api-key') ?? ''
      if (!apiKey || !validateApiKey(apiKey)) {
        return new Response(JSON.stringify({ success: false, error: 'invalid_key' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      try {
        const client = new Anthropic({ apiKey, timeout: 10_000 })
        await client.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 5,
          messages: [{ role: 'user', content: 'Hi' }],
        })
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      } catch (err) {
        const status = err instanceof Error && 'status' in err ? (err as { status: number }).status : 0
        if (status === 401) {
          return new Response(JSON.stringify({ success: false, error: 'invalid_key' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        } else if (status === 429 || status === 529) {
          return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        } else if (status >= 400) {
          const message = err instanceof Error ? err.message : ''
          const error = (message.toLowerCase().includes('credit') || message.toLowerCase().includes('billing'))
            ? 'no_credits'
            : 'invalid_key'
          return new Response(JSON.stringify({ success: false, error }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        } else {
          return new Response(JSON.stringify({ success: false, error: 'network_error' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
      }
    }

    return new Response('Not found', { status: 404, headers: corsHeaders })
  },
})

console.log(`KidStack dev API running on http://localhost:${PORT}`)
