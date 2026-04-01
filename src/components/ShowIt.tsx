import { useState } from 'react'
import { streamChat } from '../lib/api'
import type { AppSession } from '../lib/session'
import { clearSession } from '../lib/session'
import { FactBubble } from './FactBubble'

interface Props {
  session: AppSession
  onUpdate: (updates: Partial<AppSession>) => void
  onStartOver: () => void
}

/** Extract the app name from the dream plan if available */
function extractAppName(plan: string | null): string {
  if (!plan) return 'my-app'
  const match = plan.match(/^NAME:\s*(.+)/m)
  return match ? match[1].trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'my-app'
}

export function ShowIt({ session, onUpdate, onStartOver }: Props) {
  const [isLoading, setIsLoading] = useState(false)
  const [streamText, setStreamText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const html = session.buildHtml ?? ''
  const description = session.showDescription
  const appName = extractAppName(session.dreamPlan)

  async function handleGenDescription() {
    if (!html || isLoading) return

    setIsLoading(true)
    setStreamText('')
    setError(null)

    let accumulated = ''

    await streamChat(
      'show',
      [{ role: 'user', content: `Here is my app:\n\n${html}\n\nWrite a description.` }],
      {
        onDelta(text) {
          accumulated += text
          setStreamText(accumulated)
        },
        onDone() {
          onUpdate({ showDescription: accumulated })
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

  function handleDownload() {
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${appName}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleCopyDescription() {
    if (!description) return
    await navigator.clipboard.writeText(description)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleStartOver() {
    clearSession()
    onStartOver()
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-4xl">🚀</span>
          <div>
            <h2 className="text-2xl font-extrabold text-green-700">Show It</h2>
            <p className="text-gray-500 text-sm">Download your app and share it with the world!</p>
          </div>
        </div>

        {/* Celebration */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-2xl p-5 mb-4 text-center">
          <p className="text-5xl mb-2">🎉</p>
          <p className="text-2xl font-extrabold text-green-700">You built a real app!</p>
          <p className="text-gray-600 mt-1">That's amazing — most people never do this!</p>
        </div>

        {/* App preview */}
        <div className="rounded-2xl overflow-hidden border-4 border-green-300 shadow-inner bg-white mb-4">
          <div className="bg-green-100 px-4 py-2 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-400" />
            <span className="w-3 h-3 rounded-full bg-yellow-400" />
            <span className="w-3 h-3 rounded-full bg-green-400" />
            <span className="text-xs text-green-700 font-bold ml-2">{appName}.html</span>
          </div>
          <iframe
            srcDoc={html}
            sandbox="allow-scripts"
            title="Your finished app"
            className="w-full min-h-[400px] border-0"
          />
        </div>

        {/* Download button — always available */}
        <button onClick={handleDownload} className="btn-success w-full text-xl py-4 mb-4">
          ⬇️ Download My App!
        </button>

        <p className="text-xs text-gray-400 text-center mb-4">
          Opens in any browser — no internet needed!
        </p>

        {/* Description section */}
        {!description && !isLoading && (
          <button onClick={handleGenDescription} className="btn-secondary w-full">
            ✍️ Write a description for my app
          </button>
        )}

        {isLoading && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-green-600 font-bold">
              <span className="animate-bounce-slow inline-block text-2xl">✍️</span>
              <span>Writing your description…</span>
            </div>
            {streamText && (
              <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-4 text-green-800 text-sm">
                <pre className="whitespace-pre-wrap font-sans streaming-text">{streamText}</pre>
              </div>
            )}
            <FactBubble visible={true} />
          </div>
        )}

        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-3 text-red-700 text-sm">
            {error}
          </div>
        )}

        {description && !isLoading && (
          <div className="space-y-2">
            <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-4">
              <p className="font-extrabold text-green-700 text-sm mb-1">📢 Your App Description</p>
              <p className="text-gray-800">{description}</p>
            </div>
            <button
              onClick={handleCopyDescription}
              className="btn-secondary text-sm py-2 px-4 w-full"
            >
              {copied ? '✅ Copied!' : '📋 Copy Description'}
            </button>
          </div>
        )}
      </div>

      {/* Start over */}
      <div className="flex justify-center">
        <button onClick={handleStartOver} className="btn-secondary">
          Make another app! 🌟
        </button>
      </div>
    </div>
  )
}
