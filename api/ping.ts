import type { VercelRequest, VercelResponse } from '@vercel/node'
import cookie from 'cookie'

/** DEBUG: cookie import only */
export default function handler(_req: VercelRequest, res: VercelResponse) {
  const test = cookie.parse('test=1')
  res.status(200).json({ ok: true, warmed: true, debug: 'cookie-ok', parsed: test })
}
