import { useEffect, useState } from 'react'
import { getStoredApiKey, setStoredApiKey, warmPing } from './lib/api'
import { ApiKeySetup } from './components/ApiKeySetup'
import { freshSession, loadSession, saveSession } from './lib/session'
import type { AppSession } from './lib/session'
import { RoleNav } from './components/RoleNav'
import { DreamIt } from './components/DreamIt'
import { BuildIt } from './components/BuildIt'
import { CheckIt } from './components/CheckIt'
import { ShowIt } from './components/ShowIt'

const STEP_ORDER: AppSession['step'][] = ['dream', 'build', 'check', 'show']

const STEP_LABELS: Record<AppSession['step'], string> = {
  dream: 'Dream It',
  build: 'Build It',
  check: 'Check It',
  show: 'Show It',
}

export default function App() {
  const [apiKey, setApiKey] = useState<string | null>(() => getStoredApiKey())
  const [session, setSession] = useState<AppSession | null>(null)
  const [showRestorePrompt, setShowRestorePrompt] = useState(false)
  const [savedSession, setSavedSession] = useState<AppSession | null>(null)
  const [storageWarning, setStorageWarning] = useState(false)

  // Boot: warm the Vercel function + check for saved session (runs once key is present)
  useEffect(() => {
    if (!apiKey) return
    warmPing()

    const saved = loadSession()
    if (saved && saved.dreamConversation.length > 0) {
      setSavedSession(saved)
      setShowRestorePrompt(true)
    } else {
      setSession(freshSession())
    }
  }, [apiKey])

  if (!apiKey) {
    return (
      <ApiKeySetup
        onSave={(key) => {
          setStoredApiKey(key)
          setApiKey(key)
        }}
      />
    )
  }

  function handleRestore() {
    setSession(savedSession)
    setShowRestorePrompt(false)
  }

  function handleStartFresh() {
    setSession(freshSession())
    setShowRestorePrompt(false)
  }

  function updateSession(updates: Partial<AppSession>) {
    setSession((prev) => {
      if (!prev) return prev
      const next = { ...prev, ...updates }
      if (!saveSession(next)) setStorageWarning(true)
      return next
    })
  }

  function advanceStep() {
    setSession((prev) => {
      if (!prev) return prev
      const idx = STEP_ORDER.indexOf(prev.step)
      const nextStep = STEP_ORDER[Math.min(idx + 1, STEP_ORDER.length - 1)]
      const next = { ...prev, step: nextStep }
      if (!saveSession(next)) setStorageWarning(true)
      return next
    })
  }

  function handleStartOver() {
    setSession(freshSession())
  }

  function getUnlockedSteps(s: AppSession): Set<AppSession['step']> {
    const unlocked = new Set<AppSession['step']>(['dream'])
    if (s.dreamPlan) unlocked.add('build')
    if (s.buildHtml) unlocked.add('check')
    if (s.checkFeedback) unlocked.add('show')
    return unlocked
  }

  // Restore prompt
  if (showRestorePrompt) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="card max-w-sm w-full text-center space-y-4">
          <p className="text-5xl">👋</p>
          <h2 className="text-2xl font-extrabold text-indigo-700">Welcome back!</h2>
          <p className="text-gray-600">
            You were building something last time. Want to keep going?
          </p>
          {savedSession?.dreamPlan && (
            <div className="bg-indigo-50 border-2 border-indigo-200 rounded-2xl p-3 text-sm text-left">
              <pre className="whitespace-pre-wrap font-sans text-indigo-800">{savedSession.dreamPlan}</pre>
            </div>
          )}
          <div className="flex gap-3 justify-center">
            <button onClick={handleRestore} className="btn-primary">
              Keep Going! 🚀
            </button>
            <button onClick={handleStartFresh} className="btn-secondary">
              Start Fresh
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-2xl animate-pulse">🚀 Loading KidStack…</p>
      </div>
    )
  }

  const unlocked = getUnlockedSteps(session)
  const stepNumber = STEP_ORDER.indexOf(session.step) + 1

  return (
    <div className="min-h-screen">
      {/* Storage warning banner */}
      {storageWarning && (
        <div className="bg-orange-100 border-b-2 border-orange-300 px-4 py-2 flex items-center justify-between gap-3">
          <p className="text-sm font-bold text-orange-800">
            ⚠️ Oh no! Your Chromebook is running out of space to save your app. Try closing some tabs!
          </p>
          <button
            onClick={() => setStorageWarning(false)}
            className="text-orange-600 hover:text-orange-800 font-bold text-lg leading-none"
            aria-label="Dismiss warning"
          >
            ×
          </button>
        </div>
      )}

      {/* Header */}
      <header className="bg-white/80 backdrop-blur sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-3xl">🧱</span>
              <h1 className="text-2xl font-extrabold text-indigo-700">KidStack</h1>
            </div>
            <div className="flex items-center gap-3">
              <p className="text-sm font-bold text-indigo-400">
                Step {stepNumber} of 4 — {STEP_LABELS[session.step]}
              </p>
              <button
                onClick={() => {
                  if (window.confirm('Change your API key? Your current app will be saved so you can come back to it.')) {
                    setApiKey(null)
                  }
                }}
                className="text-xs text-gray-400 hover:text-gray-600 font-mono"
                title="Change API key"
              >
                🔑
              </button>
            </div>
          </div>
          <RoleNav
            current={session.step}
            unlocked={unlocked}
            onNavigate={(step) => updateSession({ step })}
          />
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {session.step === 'dream' && (
          <DreamIt session={session} onUpdate={updateSession} onNext={advanceStep} />
        )}
        {session.step === 'build' && (
          <BuildIt session={session} onUpdate={updateSession} onNext={advanceStep} />
        )}
        {session.step === 'check' && (
          <CheckIt session={session} onUpdate={updateSession} onNext={advanceStep} />
        )}
        {session.step === 'show' && (
          <ShowIt session={session} onUpdate={updateSession} onStartOver={handleStartOver} />
        )}
      </main>
    </div>
  )
}
