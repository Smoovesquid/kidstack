/**
 * Minimal local dev server for KidStack API
 * Replaces vercel dev for local testing on port 3002.
 * Run with: bun api-dev-server.ts
 */

import Anthropic from '@anthropic-ai/sdk'

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

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url)

    // CORS for localhost:5173
    const corsHeaders = {
      'Access-Control-Allow-Origin': 'http://localhost:5173',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
      'Access-Control-Allow-Credentials': 'true',
    }

    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders })
    }

    if (url.pathname === '/api/ping') {
      return new Response(JSON.stringify({ ok: true, warmed: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Set-Cookie': 'ks_session=dev; Path=/; SameSite=Strict; Max-Age=86400' },
      })
    }

    if (url.pathname === '/api/chat' && req.method === 'POST') {
      const apiKey = req.headers.get('x-api-key') ?? process.env.ANTHROPIC_API_KEY ?? ''
      if (!apiKey) {
        return new Response(JSON.stringify({ error: 'No API key' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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

      const client = new Anthropic({ apiKey })

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
            console.error('[chat] error:', err)
            encode({ type: 'error', message: "Something went wrong. Let's try that again! 🔄" })
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

    return new Response('Not found', { status: 404, headers: corsHeaders })
  },
})

console.log(`KidStack dev API running on http://localhost:${PORT}`)
