import { createHmac, timingSafeEqual } from 'crypto'

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production'
const CALL_BUDGET = parseInt(process.env.SESSION_CALL_BUDGET ?? '20', 10)
export const COOKIE_NAME = 'ks_session'
export const COOKIE_MAX_AGE = 60 * 60 * 24 // 24 hours

interface SessionPayload {
  budget: number
  created: number
  exp: number
}

/** Sign a payload with HS256 using Node's built-in crypto (no external dependencies) */
function signHS256(payload: object, secret: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url')
  return `${header}.${body}.${sig}`
}

/** Verify an HS256 JWT and return its payload, or null if invalid/expired */
function verifyHS256(token: string, secret: string): SessionPayload | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const [header, body, sig] = parts
    const expectedSig = createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url')
    const sigBuf = Buffer.from(sig, 'base64url')
    const expBuf = Buffer.from(expectedSig, 'base64url')
    if (sigBuf.length !== expBuf.length) return null
    if (!timingSafeEqual(sigBuf, expBuf)) return null
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionPayload
    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) return null
    return payload
  } catch {
    return null
  }
}

export function createSessionToken(): string {
  const payload: SessionPayload = {
    budget: CALL_BUDGET,
    created: Date.now(),
    exp: Math.floor(Date.now() / 1000) + COOKIE_MAX_AGE,
  }
  return signHS256(payload, JWT_SECRET)
}

/** Returns null if invalid/expired, or the validated payload */
export function verifySessionToken(token: string): SessionPayload | null {
  return verifyHS256(token, JWT_SECRET)
}

/** Decrement budget. Returns new token + remaining, or null if budget exhausted/invalid. */
export function consumeCall(token: string): { newToken: string; remaining: number } | null {
  const payload = verifySessionToken(token)
  if (!payload || payload.budget <= 0) return null
  const remaining = payload.budget - 1
  const newToken = signHS256(
    { budget: remaining, created: payload.created, exp: payload.exp } satisfies SessionPayload,
    JWT_SECRET,
  )
  return { newToken, remaining }
}
