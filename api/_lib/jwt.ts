import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production'
const CALL_BUDGET = parseInt(process.env.SESSION_CALL_BUDGET ?? '20', 10)
const COOKIE_NAME = 'ks_session'
const COOKIE_MAX_AGE = 60 * 60 * 24 // 24 hours

interface SessionPayload {
  budget: number
  created: number
}

export { COOKIE_NAME, COOKIE_MAX_AGE }

export function createSessionToken(): string {
  const payload: SessionPayload = { budget: CALL_BUDGET, created: Date.now() }
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' })
}

/** Returns null if invalid/expired, or the validated payload */
export function verifySessionToken(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as SessionPayload
  } catch {
    return null
  }
}

/** Decrement budget. Returns new token + remaining, or null if budget exhausted/invalid. */
export function consumeCall(token: string): { newToken: string; remaining: number } | null {
  const payload = verifySessionToken(token)
  if (!payload || payload.budget <= 0) return null
  const remaining = payload.budget - 1
  const newToken = jwt.sign(
    { budget: remaining, created: payload.created } satisfies SessionPayload,
    JWT_SECRET,
    { expiresIn: '24h' },
  )
  return { newToken, remaining }
}
