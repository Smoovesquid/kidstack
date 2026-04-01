/** Client-side API helpers — SSE stream parser for /api/chat */

type Role = 'dream' | 'build' | 'check' | 'show'

export interface SSECallbacks {
  onDelta?: (text: string) => void
  onDone?: (remaining?: number) => void
  onModerationPassed?: (html: string) => void
  onModerationFailed?: (message: string) => void
  onError?: (message: string) => void
}

/** Send a chat request and parse the SSE stream. */
export async function streamChat(
  role: Role,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  callbacks: SSECallbacks,
): Promise<void> {
  let response: Response
  try {
    response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, messages }),
      credentials: 'include',
    })
  } catch {
    callbacks.onError?.('Could not reach KidStack. Check your internet connection! 🌐')
    return
  }

  if (response.status === 429) {
    const body = (await response.json()) as { message?: string }
    callbacks.onError?.(body.message ?? "You've used all your tries for today!")
    return
  }

  if (!response.ok || !response.body) {
    callbacks.onError?.("Something went wrong. Let's try that again! 🔄")
    return
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const raw = line.slice(6).trim()
      if (!raw) continue

      let event: Record<string, unknown>
      try {
        event = JSON.parse(raw) as Record<string, unknown>
      } catch {
        continue
      }

      switch (event.type) {
        case 'delta':
          callbacks.onDelta?.(event.text as string)
          break
        case 'done':
          callbacks.onDone?.(event.remaining as number | undefined)
          break
        case 'moderation_passed':
          callbacks.onModerationPassed?.(event.html as string)
          break
        case 'moderation_failed':
          callbacks.onModerationFailed?.(event.message as string)
          break
        case 'error':
          callbacks.onError?.(event.message as string)
          break
      }
    }
  }
}

/** Warm the Vercel function and issue a session cookie if needed. */
export async function warmPing(): Promise<void> {
  try {
    await fetch('/api/ping', { credentials: 'include' })
  } catch {
    // Non-fatal — just a warm-up
  }
}
