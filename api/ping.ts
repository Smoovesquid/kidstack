import type { VercelRequest, VercelResponse } from '@vercel/node'
import cookie from 'cookie'
import { COOKIE_MAX_AGE, COOKIE_NAME, createSessionToken, verifySessionToken } from './_lib/jwt'

/** DEBUG: full imports, pinpointing jwt crash */
export default function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const token = createSessionToken()
    const valid = verifySessionToken(token)
    res.status(200).json({ ok: true, warmed: true, debug: 'jwt-ok', budget: valid?.budget, cookieName: COOKIE_NAME, maxAge: COOKIE_MAX_AGE })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.stack ?? err.message : String(err)
    res.status(200).json({ ok: false, debug: 'jwt-threw', error: msg })
  }
}
