import type { VercelRequest, VercelResponse } from '@vercel/node'
import cookie from 'cookie'
import { createHmac, timingSafeEqual } from 'crypto'

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production'
const CALL_BUDGET = parseInt(process.env.SESSION_CALL_BUDGET ?? '20', 10)
const COOKIE_NAME = 'ks_session'
const COOKIE_MAX_AGE = 60 * 60 * 24

interface SessionPayload { budget: number; created: number; exp: number }

function signHS256(payload: object, secret: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url')
  return `${header}.${body}.${sig}`
}

function verifyHS256(token: string, secret: string): SessionPayload | null {
  try {
    const [header, body, sig] = token.split('.')
    const expectedSig = createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url')
    const sigBuf = new Uint8Array(Buffer.from(sig, 'base64url'))
    const expBuf = new Uint8Array(Buffer.from(expectedSig, 'base64url'))
    if (sigBuf.length !== expBuf.length) return null
    if (!timingSafeEqual(sigBuf, expBuf)) return null
    const p = JSON.parse(Buffer.from(body, 'base64url').toString()) as SessionPayload
    return p.exp && Math.floor(Date.now() / 1000) > p.exp ? null : p
  } catch { return null }
}

/** Warm ping — no _lib import, JWT inlined */
export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') { res.status(405).json({ error: 'Method not allowed' }); return }

  const cookies = cookie.parse(req.headers.cookie ?? '')
  const valid = cookies[COOKIE_NAME] ? verifyHS256(cookies[COOKIE_NAME], JWT_SECRET) : null

  if (!valid) {
    const token = signHS256({ budget: CALL_BUDGET, created: Date.now(), exp: Math.floor(Date.now()/1000) + COOKIE_MAX_AGE }, JWT_SECRET)
    res.setHeader('Set-Cookie', cookie.serialize(COOKIE_NAME, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: COOKIE_MAX_AGE, path: '/' }))
  }

  res.status(200).json({ ok: true, warmed: true, debug: 'inlined' })
}
