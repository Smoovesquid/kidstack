import type { VercelRequest, VercelResponse } from '@vercel/node'
import cookie from 'cookie'
import { COOKIE_MAX_AGE, COOKIE_NAME, createSessionToken, verifySessionToken } from './_lib/jwt'

/** Warm ping: primes the cold-start Lambda and issues a JWT session cookie if none exists. */
export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const cookies = cookie.parse(req.headers.cookie ?? '')
  const existing = cookies[COOKIE_NAME]
  const valid = existing ? verifySessionToken(existing) : null

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
