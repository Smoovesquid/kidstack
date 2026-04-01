import Anthropic from '@anthropic-ai/sdk'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import cookie from 'cookie'
import { COOKIE_MAX_AGE, COOKIE_NAME, consumeCall, createSessionToken, verifySessionToken } from './_lib/jwt'
import { moderateContent } from './_lib/moderation'

export const config = { maxDuration: 60 }

type Role = 'dream' | 'build' | 'check' | 'show'

interface ChatRequest {
  role: Role
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
}

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

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function sendSSE(res: VercelResponse, data: object) {
  res.write(`data: ${JSON.stringify(data)}\n\n`)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  // --- Parse + validate session cookie ---
  const cookies = cookie.parse(req.headers.cookie ?? '')
  let sessionToken = cookies[COOKIE_NAME]

  // Issue a new session if missing (fallback — ping should have done this already)
  if (!sessionToken || !verifySessionToken(sessionToken)) {
    sessionToken = createSessionToken()
  }

  // Consume one call from the budget
  const consumed = consumeCall(sessionToken)
  if (!consumed) {
    res.status(429).json({
      error: 'rate_limited',
      message: "You've used all your tries for today! Come back tomorrow for more building! 🌟",
    })
    return
  }

  const { newToken, remaining } = consumed

  // Refresh the cookie with decremented budget
  res.setHeader(
    'Set-Cookie',
    cookie.serialize(COOKIE_NAME, newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    }),
  )

  // --- Parse request body ---
  const body = req.body as ChatRequest
  if (!body?.role || !body?.messages?.length) {
    res.status(400).json({ error: 'Missing role or messages' })
    return
  }

  const { role, messages } = body
  const systemPrompt = SYSTEM_PROMPTS[role]
  if (!systemPrompt) {
    res.status(400).json({ error: 'Invalid role' })
    return
  }

  // --- Set up SSE streaming ---
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no') // Disable Nginx buffering

  let fullText = ''

  try {
    const stream = client.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: role === 'build' ? 4096 : 1024,
      system: systemPrompt,
      messages,
    })

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        const text = event.delta.text
        fullText += text
        sendSSE(res, { type: 'delta', text })
      }
    }

    // For Build It: run content moderation before signaling done
    if (role === 'build') {
      const safe = await moderateContent(fullText)
      if (!safe) {
        sendSSE(res, {
          type: 'moderation_failed',
          message:
            "Hmm, let's try a different idea! Try describing a game, quiz, or art tool instead. 🎨",
        })
      } else {
        // Strip markdown fences if Haiku slipped them in despite instructions
        const cleaned = stripMarkdownFences(fullText)
        sendSSE(res, { type: 'moderation_passed', html: cleaned })
      }
    } else {
      sendSSE(res, { type: 'done', remaining })
    }
  } catch (err) {
    const isAnthropicOverload =
      err instanceof Anthropic.APIStatusError && (err.status === 429 || err.status === 529)

    if (isAnthropicOverload) {
      sendSSE(res, {
        type: 'error',
        message: 'KidStack is super busy right now — try again in a minute! ⏱️',
      })
    } else {
      console.error('[chat] stream error:', err)
      sendSSE(res, {
        type: 'error',
        message: "Something went wrong. Let's try that again! 🔄",
      })
    }
  }

  res.end()
}

/** Strip ```html ... ``` fences that Haiku sometimes wraps output in */
function stripMarkdownFences(text: string): string {
  const trimmed = text.trim()
  // Match ```html or ``` at start, ``` at end
  const fenceMatch = trimmed.match(/^```(?:html)?\s*\n?([\s\S]*?)\n?```\s*$/)
  if (fenceMatch) return fenceMatch[1].trim()
  return trimmed
}
