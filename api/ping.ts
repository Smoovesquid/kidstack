import type { VercelRequest, VercelResponse } from '@vercel/node'

/** DEBUG: minimal handler with no imports to isolate crash */
export default function handler(req: VercelRequest, res: VercelResponse) {
  res.status(200).json({ ok: true, warmed: true, debug: 'minimal' })
}
