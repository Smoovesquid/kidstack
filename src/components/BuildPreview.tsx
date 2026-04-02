import { useEffect, useState } from 'react'
import { streamChat } from '../lib/api'
import { CostMeter } from './CostMeter'

interface Props {
  skillOutput: string   // The plan text from the completed skill
  appName: string       // Friendly name to display
  totalCost: number
  onBack: () => void
}

type BuildState = 'idle' | 'building' | 'done' | 'error'

function getBuildProgress(chars: number): string {
  if (chars < 100) return 'Thinking about your idea...'
  if (chars < 400) return 'Writing the building blocks...'
  if (chars < 800) return 'Adding colors and fun stuff...'
  if (chars < 1500) return 'Making things clickable...'
  if (chars < 2500) return 'Putting it all together...'
  return 'Almost done! Adding the finishing touches...'
}

export function BuildPreview({ skillOutput, appName, totalCost, onBack }: Props) {
  const [buildState, setBuildState] = useState<BuildState>('idle')
  const [streamChars, setStreamChars] = useState(0)
  const [html, setHtml] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Auto-start building on mount
  useEffect(() => {
    handleBuild()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleBuild() {
    setBuildState('building')
    setStreamChars(0)
    setError(null)
    setHtml(null)

    let accumulated = ''

    await streamChat(
      'build',
      [{ role: 'user', content: `Here is the app plan:\n\n${skillOutput}\n\nBuild this app now.` }],
      {
        onDelta(text) {
          accumulated += text
          setStreamChars(accumulated.length)
        },
        onModerationPassed(cleanedHtml) {
          setHtml(cleanedHtml)
          setBuildState('done')
        },
        onModerationFailed(message) {
          setError(message)
          setBuildState('error')
        },
        onError(message) {
          setError(message)
          setBuildState('error')
        },
      },
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-50 flex flex-col">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur sticky top-0 z-10 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={onBack}
            disabled={buildState === 'building'}
            className="text-indigo-400 hover:text-indigo-600 font-bold text-sm flex items-center gap-1 transition-colors disabled:opacity-40"
          >
            ← Back
          </button>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🚀</span>
            <h2 className="text-lg font-extrabold text-indigo-700">
              {appName || 'My App'}
            </h2>
          </div>
          <div className="w-16" />
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 space-y-5">
        {/* Building state */}
        {buildState === 'building' && (
          <div className="card text-center space-y-5 py-10">
            <div
              className="text-7xl inline-block"
              style={{ animation: 'rocket-bounce 1.2s ease-in-out infinite' }}
              aria-hidden
            >
              🚀
            </div>
            <div>
              <p className="text-2xl font-extrabold text-blue-700 mb-1">
                Building your app!
              </p>
              <p className="text-gray-500 text-sm">This takes about 30 seconds…</p>
            </div>
            <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-5">
              <div className="text-4xl mb-2 animate-pulse">✨</div>
              <p className="font-bold text-blue-700 text-lg" aria-live="polite">
                {getBuildProgress(streamChars)}
              </p>
            </div>
          </div>
        )}

        {/* Error state */}
        {buildState === 'error' && (
          <div className="card space-y-4">
            <div className="bg-orange-50 border-2 border-orange-300 rounded-2xl p-5 text-orange-700">
              <p className="text-4xl mb-2">🙈</p>
              <p className="font-extrabold text-lg mb-1">Hmm, something went wrong!</p>
              <p className="text-sm">{error}</p>
            </div>
            <button onClick={handleBuild} className="btn-primary w-full">
              Try Again 🔄
            </button>
            <button onClick={onBack} className="btn-secondary w-full">
              ← Go back
            </button>
          </div>
        )}

        {/* Done state */}
        {buildState === 'done' && html && (
          <div className="space-y-4">
            {/* Success badge */}
            <div className="flex items-center gap-3 bg-green-50 border-2 border-green-300 rounded-2xl px-5 py-3">
              <span className="text-3xl">✅</span>
              <div>
                <p className="font-extrabold text-green-700">Your app is live!</p>
                <p className="text-sm text-green-600">Try clicking around inside it 👇</p>
              </div>
            </div>

            {/* Browser chrome + iframe */}
            <div className="rounded-3xl overflow-hidden border-4 border-green-300 shadow-xl bg-white">
              {/* Fake browser bar */}
              <div className="bg-gray-100 px-4 py-2 flex items-center gap-2 border-b border-gray-200">
                <span className="w-3 h-3 rounded-full bg-red-400" />
                <span className="w-3 h-3 rounded-full bg-yellow-400" />
                <span className="w-3 h-3 rounded-full bg-green-400" />
                <span className="text-xs text-gray-500 font-bold ml-2 flex-1 text-center">
                  🌐 {appName || 'My App'}
                </span>
              </div>
              <iframe
                srcDoc={html}
                sandbox="allow-scripts"
                title={`${appName || 'My App'} preview`}
                className="w-full border-0"
                style={{ height: '480px' }}
              />
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button onClick={handleBuild} className="btn-secondary text-sm py-3 px-5">
                Rebuild 🔨
              </button>
              <button onClick={onBack} className="btn-secondary text-sm py-3 px-5 flex-1">
                ← New skill
              </button>
            </div>
          </div>
        )}
      </main>

      <CostMeter totalCost={totalCost} />
    </div>
  )
}
