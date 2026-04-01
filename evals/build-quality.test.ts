/**
 * EVAL-1: Build It output quality
 *
 * Sends representative kid app plans to the Anthropic API directly (using the same
 * system prompt as the /api/chat handler) and asserts:
 *   1. Structural gate: response starts with `<`, is valid HTML
 *   2. Quality gate: LLM judge rates 7/10+ on "would a 7-year-old feel proud of this?"
 *
 * Requires: ANTHROPIC_API_KEY in env
 */

import Anthropic from '@anthropic-ai/sdk'
import { describe, expect, test } from 'bun:test'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const BUILD_SYSTEM = `You are a coding helper for kids. You turn app plans into real working apps.

CRITICAL RULES:
1. Output ONLY valid HTML. No markdown. No code fences. No explanation text.
2. The FIRST character of your response MUST be the < character.
3. All CSS must be inline in a <style> tag. All JavaScript must be inline in a <script> tag.
4. The app must be self-contained — no external URLs, CDN links, or imports.
5. The app MUST have at least one interactive element (button, input, or clickable element).
6. Make it colorful, fun, and visually appealing for kids aged 7-12.
7. Use bright colors, large text, and simple layouts.
8. Keep the code simple — no build tools, no frameworks, just HTML+CSS+JS.`

const JUDGE_SYSTEM = `You are a quality judge for a kids' coding app. You will be given HTML code for an app built for kids aged 7-12.

Rate the app on a scale of 1-10 based on: Would a 7-year-old feel proud to show this to their friends?

Consider:
- Is it visually appealing and colorful?
- Does it have at least one interactive element?
- Is it complete and functional (not a skeleton or placeholder)?
- Would a child find it fun or useful?
- Is it free of errors or broken layout?

Respond with ONLY a JSON object: {"score": <number 1-10>, "reason": "<one sentence>"}`

const TEST_PLANS = [
  `NAME: Animal Quiz
FOR: kids who love animals
DOES: asks animal questions, shows the answer, keeps score
LOOKS LIKE: bright screen with a big question, 4 answer buttons, and a score at the top`,

  `NAME: Pixel Art Maker
FOR: kids who like drawing
DOES: lets you click squares to color them, pick different colors, clear the canvas
LOOKS LIKE: a grid of squares you can click to paint, with a color picker below`,

  `NAME: Joke Machine
FOR: anyone who wants to laugh
DOES: shows a random joke, reveals the punchline when you click, lets you get a new joke
LOOKS LIKE: a big joke card with a "Reveal!" button and a "Next Joke" button`,
]

describe('EVAL-1: Build It output quality', () => {
  for (const plan of TEST_PLANS) {
    const planName = plan.match(/^NAME:\s*(.+)/m)?.[1] ?? 'Unknown'

    test(`${planName} — structural gate`, async () => {
      const response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        system: BUILD_SYSTEM,
        messages: [{ role: 'user', content: `Here is the app plan:\n\n${plan}\n\nBuild this app now.` }],
      })

      const html = (response.content[0] as Anthropic.TextBlock).text

      // Gate 1: Must start with <
      expect(html.trimStart()[0]).toBe('<')

      // Gate 2: Must contain <html or <!DOCTYPE or at least a <div / <body
      expect(html.toLowerCase()).toMatch(/<html|<!doctype|<body|<div/)

      // Gate 3: Must have at least one interactive element
      expect(html.toLowerCase()).toMatch(/button|input|onclick|addEventListener/)

      // Gate 4: Must have a closing tag (not truncated)
      expect(html.toLowerCase()).toMatch(/<\/html>|<\/body>|<\/div>/)
    }, 30_000)

    test(`${planName} — quality gate (LLM judge ≥ 7/10)`, async () => {
      // Build the app
      const buildResponse = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        system: BUILD_SYSTEM,
        messages: [{ role: 'user', content: `Here is the app plan:\n\n${plan}\n\nBuild this app now.` }],
      })

      const html = (buildResponse.content[0] as Anthropic.TextBlock).text

      // Judge the output
      const judgeResponse = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        system: JUDGE_SYSTEM,
        messages: [{ role: 'user', content: `Rate this kid's app:\n\n${html.slice(0, 6000)}` }],
      })

      const judgeText = (judgeResponse.content[0] as Anthropic.TextBlock).text.trim()
      let judgeResult: { score: number; reason: string }

      try {
        judgeResult = JSON.parse(judgeText) as { score: number; reason: string }
      } catch {
        throw new Error(`Judge returned non-JSON: ${judgeText}`)
      }

      console.log(`  ${planName}: ${judgeResult.score}/10 — ${judgeResult.reason}`)

      expect(judgeResult.score).toBeGreaterThanOrEqual(7)
    }, 60_000)
  }
})
