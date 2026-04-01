import { useState } from 'react'
import { streamChat } from '../lib/api'
import type { AppSession } from '../lib/session'
import { FactBubble } from './FactBubble'

interface Props {
  session: AppSession
  onUpdate: (updates: Partial<AppSession>) => void
  onNext: () => void
}

export function CheckIt({ session, onUpdate, onNext }: Props) {
  const [isLoading, setIsLoading] = useState(false)
  const [streamText, setStreamText] = useState('')
  const [error, setError] = useState<string | null>(null)

  const html = session.buildHtml ?? ''
  const feedback = session.checkFeedback

  async function handleCheck() {
    if (!html || isLoading) return

    setIsLoading(true)
    setStreamText('')
    setError(null)

    let accumulated = ''

    await streamChat(
      'check',
      [{ role: 'user', content: `Here is the app code:\n\n${html}` }],
      {
        onDelta(text) {
          accumulated += text
          setStreamText(accumulated)
        },
        onDone() {
          onUpdate({ checkFeedback: accumulated })
          setStreamText('')
          setIsLoading(false)
        },
        onError(message) {
          setError(message)
          setStreamText('')
          setIsLoading(false)
        },
      },
    )
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-4xl">🔍</span>
          <div>
            <h2 className="text-2xl font-extrabold text-yellow-700">Check It</h2>
            <p className="text-gray-500 text-sm">Get friendly feedback on your app!</p>
          </div>
        </div>

        {/* App preview (compact) */}
        <div className="rounded-2xl overflow-hidden border-2 border-yellow-200 shadow-inner bg-white mb-4">
          <div className="bg-yellow-50 px-4 py-1 text-xs font-bold text-yellow-700">Your App</div>
          <iframe
            srcDoc={html}
            sandbox="allow-scripts"
            title="Your app"
            className="w-full h-48 border-0"
          />
        </div>

        {!feedback && !isLoading && (
          <button onClick={handleCheck} className="btn-primary w-full text-xl py-4">
            🔍 Check My App!
          </button>
        )}

        {isLoading && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-yellow-600 font-bold">
              <span className="animate-bounce-slow inline-block text-2xl">🔍</span>
              <span>Looking at your app carefully…</span>
            </div>
            {streamText && (
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-4 text-yellow-800 text-sm">
                <pre className="whitespace-pre-wrap font-sans streaming-text">{streamText}</pre>
              </div>
            )}
            <FactBubble visible={true} />
          </div>
        )}

        {error && (
          <div className="space-y-3">
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-3 text-red-700 text-sm">
              {error}
            </div>
            <button onClick={handleCheck} className="btn-primary">
              Try Again 🔄
            </button>
          </div>
        )}

        {feedback && !isLoading && (
          <div className="space-y-3">
            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-2xl p-4">
              <p className="font-extrabold text-yellow-700 mb-2">Here's what I found!</p>
              <pre className="text-gray-800 text-sm whitespace-pre-wrap font-sans leading-relaxed">{feedback}</pre>
            </div>

            <div className="flex gap-3 flex-wrap">
              <button onClick={onNext} className="btn-success">
                Show It! 🚀
              </button>
              <button
                onClick={() => {
                  onUpdate({ checkFeedback: null })
                  setError(null)
                }}
                className="btn-secondary text-sm py-2 px-4"
              >
                Check Again 🔍
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
