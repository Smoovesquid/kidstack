import type { VercelRequest, VercelResponse } from '@vercel/node'
import cookie from 'cookie'
import { createHmac, timingSafeEqual } from 'crypto'

// --- JWT (inlined — Vercel's bundler can't resolve TS subdirectory imports) ---

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production'
const CALL_BUDGET = parseInt(process.env.SESSION_CALL_BUDGET ?? '20', 10)
const COOKIE_NAME = 'ks_session'
const COOKIE_MAX_AGE = 60 * 60 * 24 // 24 hours

interface SessionPayload { budget: number; created: number; exp: number }

function signToken(payload: object, secret: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url')
  return `${header}.${body}.${sig}`
}

function verifyToken(token: string, secret: string): SessionPayload | null {
  try {
    const [header, body, sig] = token.split('.')
    if (!header || !body || !sig) return null
    const expected = createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url')
    const sigBuf = new Uint8Array(Buffer.from(sig, 'base64url'))
    const expBuf = new Uint8Array(Buffer.from(expected, 'base64url'))
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return null
    const p = JSON.parse(Buffer.from(body, 'base64url').toString()) as SessionPayload
    return p.exp && Math.floor(Date.now() / 1000) > p.exp ? null : p
  } catch { return null }
}

function createSessionToken(): string {
  return signToken({ budget: CALL_BUDGET, created: Date.now(), exp: Math.floor(Date.now() / 1000) + COOKIE_MAX_AGE }, JWT_SECRET)
}

// --- Handler ---

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const cookies = cookie.parse(req.headers.cookie ?? '')
  const existing = cookies[COOKIE_NAME]
  const valid = existing ? verifyToken(existing, JWT_SECRET) : null

  if (!valid) {
    const token = createSessionToken()
    res.setHeader(
      'Set-Cookie',
      cookie.serialize(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: COOKIE_MAX_AGE,
        path: '/',
      }),
    )
  }

  res.status(200).json({ ok: true, warmed: true })
}
