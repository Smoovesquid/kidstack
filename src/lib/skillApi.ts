/** SSE streaming helper for POST /api/skill */
import { getStoredApiKey } from './api'

export interface SkillSSECallbacks {
  onText?: (text: string) => void
  onTokens?: (input: number, output: number) => void
  onDone?: () => void
  onError?: (code: string, message: string) => void
}

export async function streamSkill(
  skill: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  callbacks: SkillSSECallbacks,
): Promise<void> {
  let response: Response
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    const key = getStoredApiKey()
    if (key) headers['x-api-key'] = key
    response = await fetch('/api/skill', {
      method: 'POST',
      headers,
      body: JSON.stringify({ skill, messages }),
    })
  } catch {
    callbacks.onError?.('NETWORK', 'Could not reach KidStack. Check your internet! 🌐')
    return
  }

  if (!response.body) {
    callbacks.onError?.('HTTP_ERROR', "Something went wrong. Let's try again! 🔄")
    return
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let pendingEventType: string | null = null

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (line.startsWith('event: ')) {
          pendingEventType = line.slice(7).trim()
          continue
        }
        if (!line.startsWith('data: ')) {
          if (line === '') pendingEventType = null
          continue
        }

        const raw = line.slice(6).trim()
        if (!raw) continue

        let event: Record<string, unknown>
        try {
          event = JSON.parse(raw) as Record<string, unknown>
        } catch {
          continue
        }

        const eventType = pendingEventType ?? (event.type as string)
        pendingEventType = null

        switch (eventType) {
          case 'text':
            callbacks.onText?.(event.content as string)
            break
          case 'tokens':
            callbacks.onTokens?.(event.input as number, event.output as number)
            break
          case 'done':
            callbacks.onDone?.()
            break
          case 'error':
            callbacks.onError?.(
              (event.code as string) ?? 'ERROR',
              (event.message as string) ?? 'Unknown error',
            )
            break
        }
      }
    }
  } catch {
    callbacks.onError?.('STREAM_ERROR', 'Connection interrupted. Try again! 🔄')
  }
}

/** Calculate cost in dollars from token counts (Haiku rates) */
export function calcCost(inputTokens: number, outputTokens: number): number {
  return (inputTokens * 0.25 + outputTokens * 1.25) / 1_000_000
}
