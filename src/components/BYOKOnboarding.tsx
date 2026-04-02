import { useState } from 'react'
import { setStoredApiKey } from '../lib/api'

interface Props {
  onComplete: (apiKey: string) => void
}

type Screen = 1 | 2 | 3 | 4 | 5 | 6
type ValidationStatus = 'idle' | 'wrong_prefix' | 'too_short' | 'valid'
type TestStatus = 'idle' | 'testing' | 'success' | 'invalid_key' | 'no_credits' | 'network_error'

function getValidationStatus(key: string): ValidationStatus {
  if (!key) return 'idle'
  if (!key.startsWith('sk-ant-')) return 'wrong_prefix'
  if (key.length < 40) return 'too_short'
  return 'valid'
}

// Dot progress indicator — shows steps 1–5 (screen 6 is the success screen)
function ProgressDots({ current }: { current: Screen }) {
  const total = 5
  const active = Math.min(current, total)
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: total }, (_, i) => {
        const step = i + 1
        return (
          <div
            key={step}
            className={`rounded-full transition-all duration-200 ${
              step === active
                ? 'w-6 h-2.5 bg-blue-600'
                : step < active
                  ? 'w-2.5 h-2.5 bg-blue-300'
                  : 'w-2.5 h-2.5 bg-slate-200'
            }`}
          />
        )
      })}
    </div>
  )
}

// ─── Screen 1: Welcome ───────────────────────────────────────────────────────

function WelcomeScreen({ onNext, onSkipToKey }: { onNext: () => void; onSkipToKey: () => void }) {
  return (
    <div className="space-y-8">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-100 text-blue-600">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-slate-800">Set Up Your AI Key</h1>
        <p className="text-slate-500 text-sm">One-time setup for KidStack</p>
      </div>

      <div className="space-y-4">
        <div className="flex gap-3 items-start">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-semibold text-sm">🔑</div>
          <div>
            <p className="font-semibold text-slate-700">What is an AI key?</p>
            <p className="text-slate-500 text-sm mt-0.5">It's like a password that lets the AI help your kid build apps. You get it directly from Anthropic, the company that makes the AI.</p>
          </div>
        </div>
        <div className="flex gap-3 items-start">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-green-600 font-semibold text-sm">💰</div>
          <div>
            <p className="font-semibold text-slate-700">How much does it cost?</p>
            <p className="text-slate-500 text-sm mt-0.5">About 10 cents per app your kid builds. You control the budget — add as much or as little as you want.</p>
          </div>
        </div>
        <div className="flex gap-3 items-start">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 font-semibold text-sm">⏱️</div>
          <div>
            <p className="font-semibold text-slate-700">How long does setup take?</p>
            <p className="text-slate-500 text-sm mt-0.5">About 3 minutes. We'll walk you through every step.</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <button onClick={onNext} className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-4 px-6 rounded-xl text-lg transition-colors shadow-sm">
          Let's Set It Up →
        </button>
        <button
          onClick={onSkipToKey}
          className="w-full text-slate-500 hover:text-slate-700 text-sm py-2 transition-colors"
        >
          I already have a key
        </button>
      </div>
    </div>
  )
}

// ─── Screen 2: Step-by-Step Guide ────────────────────────────────────────────

function GuideScreen({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const steps = [
    { n: 1, text: 'Go to console.anthropic.com' },
    { n: 2, text: 'Create a free account (or sign in)' },
    { n: 3, text: 'Click "API Keys" in the left sidebar' },
    { n: 4, text: 'Click "Create Key" and give it a name' },
    { n: 5, text: 'Copy the key — it starts with sk-ant-' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">How to Get Your Key</h2>
        <p className="text-slate-500 text-sm mt-1">Follow these steps on the Anthropic website</p>
      </div>

      <div className="space-y-3">
        {steps.map(({ n, text }) => (
          <div key={n} className="flex gap-3 items-center bg-slate-50 rounded-xl p-4 border border-slate-100">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
              {n}
            </div>
            <p className="text-slate-700 font-medium">{text}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <a
          href="https://console.anthropic.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full bg-slate-800 hover:bg-slate-900 text-white font-semibold py-3.5 px-6 rounded-xl transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          Open Anthropic Console
        </a>
        <button
          onClick={onNext}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 px-6 rounded-xl transition-colors"
        >
          I've got my key! →
        </button>
        <button onClick={onBack} className="w-full text-slate-400 hover:text-slate-600 text-sm py-2 transition-colors">
          ← Back
        </button>
      </div>
    </div>
  )
}

// ─── Screen 3: Create Key (Visual Guide) ─────────────────────────────────────

function CreateKeyScreen({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Creating Your Key</h2>
        <p className="text-slate-500 text-sm mt-1">Here's what to look for on the Anthropic console</p>
      </div>

      {/* Simplified visual guide */}
      <div className="border-2 border-slate-200 rounded-2xl overflow-hidden">
        {/* Mock browser bar */}
        <div className="bg-slate-100 px-4 py-2.5 flex items-center gap-2 border-b border-slate-200">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-slate-300" />
            <div className="w-3 h-3 rounded-full bg-slate-300" />
            <div className="w-3 h-3 rounded-full bg-slate-300" />
          </div>
          <div className="flex-1 bg-white rounded-md px-3 py-1 text-xs text-slate-400 font-mono">
            console.anthropic.com/settings/keys
          </div>
        </div>

        {/* Mock console UI */}
        <div className="bg-white p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-slate-700 text-sm">API Keys</p>
            <div className="bg-blue-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1">
              <span className="text-base leading-none">+</span>
              <span>Create Key</span>
              <div className="absolute ml-16 -mt-8">
                <div className="bg-amber-400 text-amber-900 text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap">
                  ← Click this!
                </div>
              </div>
            </div>
          </div>
          <div className="border border-slate-100 rounded-lg p-3 bg-slate-50">
            <p className="text-xs text-slate-400 font-mono">No API keys yet</p>
          </div>

          {/* Arrow pointing to create button */}
          <div className="flex items-center gap-2 text-blue-600 text-sm font-medium">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 11l5-5m0 0l5 5m-5-5v12" />
            </svg>
            Click the "Create Key" button above
          </div>
        </div>
      </div>

      <div className="space-y-2.5">
        {[
          'Look for the blue "Create Key" button in the top right',
          'Name it anything — "KidStack" works great',
          'Copy the long code that starts with sk-ant-',
        ].map((tip, i) => (
          <div key={i} className="flex gap-2.5 items-start">
            <div className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-slate-600 text-sm">{tip}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <button onClick={onNext} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 px-6 rounded-xl transition-colors">
          Next →
        </button>
        <button onClick={onBack} className="w-full text-slate-400 hover:text-slate-600 text-sm py-2 transition-colors">
          ← Back
        </button>
      </div>
    </div>
  )
}

// ─── Screen 4: Video Placeholder ─────────────────────────────────────────────

function VideoScreen({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Watch the Walkthrough</h2>
        <p className="text-slate-500 text-sm mt-1">A quick 90-second video showing exactly what to do</p>
      </div>

      {/* Video placeholder */}
      <div className="relative aspect-video bg-slate-100 rounded-2xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-3 text-slate-400">
        <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center">
          <svg className="w-8 h-8 ml-1" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
        <div className="text-center">
          <p className="font-semibold text-slate-500">Video coming soon!</p>
          <p className="text-xs text-slate-400 mt-1">90-second walkthrough</p>
        </div>
      </div>

      <div className="space-y-3">
        <button onClick={onNext} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 px-6 rounded-xl transition-colors">
          Skip — I've got my key →
        </button>
        <button onClick={onBack} className="w-full text-slate-400 hover:text-slate-600 text-sm py-2 transition-colors">
          ← Back
        </button>
      </div>
    </div>
  )
}

// ─── Screen 5: Enter & Test Key ───────────────────────────────────────────────

function EnterKeyScreen({ onSuccess, onBack }: { onSuccess: (key: string) => void; onBack: () => void }) {
  const [value, setValue] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [testStatus, setTestStatus] = useState<TestStatus>('idle')

  const validation = getValidationStatus(value.trim())
  const isFormatValid = validation === 'valid'

  async function handleTest() {
    if (!isFormatValid) return
    setTestStatus('testing')

    try {
      const res = await fetch('/api/test-key', {
        method: 'POST',
        headers: { 'x-api-key': value.trim() },
      })
      const data = await res.json() as { success: boolean; error?: string }

      if (data.success) {
        setTestStatus('success')
        // Small delay so user sees the success state before advancing
        setTimeout(() => onSuccess(value.trim()), 1200)
      } else {
        setTestStatus((data.error as TestStatus) ?? 'invalid_key')
      }
    } catch {
      setTestStatus('network_error')
    }
  }

  const errorMessages: Record<string, string> = {
    invalid_key: 'Double-check you copied the whole thing. It\'s a very long code!',
    no_credits: 'Your key works, but you need to add credits at console.anthropic.com/settings/billing',
    network_error: 'Check your internet connection and try again.',
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Enter Your API Key</h2>
        <p className="text-slate-500 text-sm mt-1">Paste the key you copied from Anthropic</p>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-semibold text-slate-700">
          API Key
        </label>
        <div className="relative">
          <input
            type={showKey ? 'text' : 'password'}
            value={value}
            onChange={(e) => {
              setValue(e.target.value)
              setTestStatus('idle')
            }}
            placeholder="sk-ant-api03-..."
            className="w-full border-2 border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3.5 pr-12 font-mono text-sm outline-none transition-colors bg-white"
            autoComplete="off"
            autoFocus
          />
          <button
            type="button"
            onClick={() => setShowKey((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
            aria-label={showKey ? 'Hide key' : 'Show key'}
          >
            {showKey ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>

        {/* Inline validation */}
        {value && testStatus === 'idle' && (
          <div className={`flex items-center gap-1.5 text-sm font-medium ${
            validation === 'valid' ? 'text-emerald-600' : 'text-red-500'
          }`}>
            {validation === 'valid' ? (
              <>
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Looks right!
              </>
            ) : validation === 'wrong_prefix' ? (
              <>
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Keys start with sk-ant-
              </>
            ) : (
              <>
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Key looks too short
              </>
            )}
          </div>
        )}

        {/* Test result states */}
        {testStatus === 'success' && (
          <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Your key works!
          </div>
        )}

        {(testStatus === 'invalid_key' || testStatus === 'no_credits' || testStatus === 'network_error') && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
            <p className="text-sm font-semibold text-red-700">
              {testStatus === 'invalid_key' ? 'Invalid key' : testStatus === 'no_credits' ? 'No credits' : 'Connection error'}
            </p>
            <p className="text-sm text-red-600 mt-0.5">{errorMessages[testStatus]}</p>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <button
          onClick={handleTest}
          disabled={!isFormatValid || testStatus === 'testing' || testStatus === 'success'}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold py-3.5 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {testStatus === 'testing' ? (
            <>
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Testing your key…
            </>
          ) : testStatus === 'success' ? (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Key verified!
            </>
          ) : (
            'Test My Key'
          )}
        </button>
        <button onClick={onBack} className="w-full text-slate-400 hover:text-slate-600 text-sm py-2 transition-colors">
          ← Back
        </button>
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-400">
        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <span>Your key is saved on this device only — we never see it</span>
      </div>
    </div>
  )
}

// ─── Screen 6: Success ────────────────────────────────────────────────────────

function SuccessScreen({ onComplete }: { onComplete: () => void }) {
  return (
    <div className="text-center space-y-8">
      <div className="space-y-4">
        <div className="text-6xl">🎉</div>
        <h2 className="text-3xl font-bold text-slate-800">You're all set!</h2>
        <p className="text-slate-600 text-lg">Your kid can now build apps with AI.</p>
      </div>

      <div className="bg-slate-50 rounded-2xl p-5 space-y-3 text-left border border-slate-100">
        {[
          'Your key is saved on this device only',
          'We never see or store your API key',
          'You can change or remove it anytime',
        ].map((fact, i) => (
          <div key={i} className="flex items-center gap-2.5 text-sm text-slate-600">
            <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            {fact}
          </div>
        ))}
      </div>

      <button
        onClick={onComplete}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-xl text-lg transition-colors shadow-sm"
      >
        Start Building! 🚀
      </button>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function BYOKOnboarding({ onComplete }: Props) {
  const [screen, setScreen] = useState<Screen>(1)
  const [apiKey, setApiKey] = useState('')

  function handleKeySuccess(key: string) {
    setApiKey(key)
    setStoredApiKey(key)
    setScreen(6)
  }

  function handleComplete() {
    onComplete(apiKey)
  }

  const showProgress = screen < 6

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <span className="text-2xl">🧱</span>
          <span className="text-xl font-bold text-slate-700">KidStack</span>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-lg border border-slate-100 p-6 sm:p-8">
          {screen === 1 && (
            <WelcomeScreen
              onNext={() => setScreen(2)}
              onSkipToKey={() => setScreen(5)}
            />
          )}
          {screen === 2 && (
            <GuideScreen
              onNext={() => setScreen(3)}
              onBack={() => setScreen(1)}
            />
          )}
          {screen === 3 && (
            <CreateKeyScreen
              onNext={() => setScreen(4)}
              onBack={() => setScreen(2)}
            />
          )}
          {screen === 4 && (
            <VideoScreen
              onNext={() => setScreen(5)}
              onBack={() => setScreen(3)}
            />
          )}
          {screen === 5 && (
            <EnterKeyScreen
              onSuccess={handleKeySuccess}
              onBack={() => setScreen(screen === 5 && apiKey === '' ? 4 : 1)}
            />
          )}
          {screen === 6 && (
            <SuccessScreen onComplete={handleComplete} />
          )}
        </div>

        {/* Progress dots */}
        {showProgress && (
          <div className="mt-6">
            <ProgressDots current={screen} />
          </div>
        )}
      </div>
    </div>
  )
}
