import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createHmac } from 'crypto'

/** DEBUG: test crypto import */
export default function handler(_req: VercelRequest, res: VercelResponse) {
  const sig = createHmac('sha256', 'test').update('hello').digest('hex')
  res.status(200).json({ ok: true, sig, debug: 'crypto-direct' })
}
