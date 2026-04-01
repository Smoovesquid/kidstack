/** Persistent session state — auto-saved to localStorage after every AI step */

export interface AppSession {
  step: 'dream' | 'build' | 'check' | 'show'
  dreamConversation: Array<{ role: 'user' | 'assistant'; content: string }>
  dreamPlan: string | null       // Structured plan text from Dream It
  buildHtml: string | null       // Generated HTML artifact
  checkFeedback: string | null   // QA feedback from Check It
  showDescription: string | null // Sharing description from Show It
  savedAt: number
}

const STORAGE_KEY = 'kidstack_session'

export function loadSession(): AppSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as AppSession
    // Expire sessions older than 24h
    if (Date.now() - parsed.savedAt > 60 * 60 * 24 * 1000) {
      clearSession()
      return null
    }
    return parsed
  } catch {
    return null
  }
}

/** Returns false if storage quota was exceeded (common on school Chromebooks). */
export function saveSession(session: AppSession): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...session, savedAt: Date.now() }))
    return true
  } catch {
    return false
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore
  }
}

export function freshSession(): AppSession {
  return {
    step: 'dream',
    dreamConversation: [],
    dreamPlan: null,
    buildHtml: null,
    checkFeedback: null,
    showDescription: null,
    savedAt: Date.now(),
  }
}
