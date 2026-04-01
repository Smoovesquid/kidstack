import { useState } from 'react'
import { streamChat } from '../lib/api'
import type { AppSession } from '../lib/session'
import { FactBubble } from './FactBubble'

interface Props {
  session: AppSession
  onUpdate: (updates: Partial<AppSession>) => void
  onNext: () => void
}

type BuildState = 'idle' | 'streaming' | 'moderating' | 'done' | 'blocked' | 'error'

export function BuildIt({ session, onUpdate, onNext }: Props) {
  const [buildState, setBuildState] = useState<BuildState>(session.buildHtml ? 'done' : 'idle')
  const [streamText, setStreamText] = useState('')
  const [error, setError] = useState<string | null>(null)

  const plan = session.dreamPlan ?? ''
  const html = session.buildHtml

  async function handleBuild() {
    if (!plan || buildState === 'streaming' || buildState === 'moderating') return

    setBuildState('streaming')
    setStreamText('')
    setError(null)

    let accumulated = ''

    await streamChat(
      'build',
      [{ role: 'user', content: `Here is the app plan:\n\n${plan}\n\nBuild this app now.` }],
      {
        onDelta(text) {
          accumulated += text
          setStreamText(accumulated)
        },
        onModerationPassed(cleanedHtml) {
          onUpdate({ buildHtml: cleanedHtml })
          setStreamText('')
          setBuildState('done')
        },
        onModerationFailed(message) {
          setError(message)
          setStreamText('')
          setBuildState('blocked')
        },
        onError(message) {
          setError(message)
          setStreamText('')
          setBuildState('error')
        },
      },
    )

  }

  function handleRebuild() {
    onUpdate({ buildHtml: null, checkFeedback: null, showDescription: null })
    setBuildState('idle')
    setStreamText('')
    setError(null)
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-4xl">🔨</span>
          <div>
            <h2 className="text-2xl font-extrabold text-blue-700">Build It</h2>
            <p className="text-gray-500 text-sm">The AI will turn your plan into a real app!</p>
          </div>
        </div>

        {/* Plan summary */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 mb-4">
          <p className="font-extrabold text-blue-700 text-sm mb-1">📋 Your Plan</p>
          <pre className="text-sm text-blue-800 whitespace-pre-wrap font-sans">{plan}</pre>
        </div>

        {/* Build states */}
        {buildState === 'idle' && (
          <button onClick={handleBuild} className="btn-primary w-full text-xl py-4">
            🔨 Build My App!
          </button>
        )}

        {buildState === 'streaming' && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-blue-600 font-bold">
              <span className="text-2xl rocket-bounce inline-block">🚀</span>
              <span>Building your app… this takes about 30 seconds!</span>
            </div>
            {streamText && (
              <div className="bg-gray-900 text-green-400 rounded-2xl p-4 h-40 overflow-hidden text-xs font-mono opacity-70">
                <pre className="streaming-text">{streamText.slice(-800)}</pre>
              </div>
            )}
            <FactBubble visible={true} />
          </div>
        )}

        {buildState === 'moderating' && (
          <div className="flex items-center gap-3 text-blue-600 font-bold">
            <span className="animate-spin-slow inline-block text-2xl">🛡️</span>
            <span>Checking everything is safe…</span>
          </div>
        )}

        {buildState === 'blocked' && (
          <div className="space-y-3">
            <div className="bg-orange-50 border-2 border-orange-300 rounded-2xl p-4 text-orange-700">
              <p className="font-extrabold text-lg mb-1">🙈 Hmm, let's try a different idea!</p>
              <p className="text-sm">{error}</p>
            </div>
            <button onClick={handleRebuild} className="btn-secondary">
              ← Go back and change my plan
            </button>
          </div>
        )}

        {buildState === 'error' && (
          <div className="space-y-3">
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 text-red-700 text-sm">
              {error}
            </div>
            <button onClick={handleBuild} className="btn-primary">
              Try Again 🔄
            </button>
          </div>
        )}

        {buildState === 'done' && html && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-green-600 font-bold">
              <span className="text-2xl">✅</span>
              <span>Your app is ready! Try it out below!</span>
            </div>

            {/* Live iframe preview */}
            <div className="rounded-2xl overflow-hidden border-4 border-green-300 shadow-inner bg-white">
              <div className="bg-green-100 px-4 py-2 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-400" />
                <span className="w-3 h-3 rounded-full bg-yellow-400" />
                <span className="w-3 h-3 rounded-full bg-green-400" />
                <span className="text-xs text-green-700 font-bold ml-2">Your App Preview</span>
              </div>
              <iframe
                srcDoc={html}
                sandbox="allow-scripts"
                title="Your app preview"
                className="w-full h-80 border-0"
              />
            </div>

            <div className="flex gap-3 flex-wrap">
              <button onClick={onNext} className="btn-success">
                Check It! 🔍
              </button>
              <button onClick={handleRebuild} className="btn-secondary text-sm py-2 px-4">
                Rebuild 🔨
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
