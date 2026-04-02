import type { VercelRequest, VercelResponse } from '@vercel/node'
import { greet } from './utils2/hello'

/** DEBUG: minimal subdirectory import */
export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.status(200).json({ ok: true, msg: greet(), debug: 'subdir-import' })
}
