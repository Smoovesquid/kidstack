import type { VercelRequest, VercelResponse } from '@vercel/node'
// @ts-ignore
import { greet } from './utils3/hello.js'

/** DEBUG: plain .js subdir import */
export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.status(200).json({ ok: true, msg: greet(), debug: 'js-subdir' })
}
