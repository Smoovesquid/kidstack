import { useEffect, useRef, useState } from 'react'
import { streamChat } from '../lib/api'
import type { AppSession } from '../lib/session'
import { FactBubble } from './FactBubble'

/** Render **bold** and *italic* markdown inline as React elements (no dangerouslySetInnerHTML). */
function renderMarkdown(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={i}>{part.slice(1, -1)}</em>
    }
    return part
  })
}

interface Props {
  session: AppSession
  onUpdate: (updates: Partial<AppSession>) => void
  onNext: () => void
}

const PLAN_PATTERN = /^NAME:/m

function isPlan(text: string): boolean {
  return PLAN_PATTERN.test(text)
}

export function DreamIt({ session, onUpdate, onNext }: Props) {
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const conversation = session.dreamConversation
  const hasPlan = !!session.dreamPlan

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversation, streamingText])

  async function handleSend() {
    const trimmed = input.trim()
    if (!trimmed || isLoading) return

    setError(null)
    setInput('')

    const userMessage = { role: 'user' as const, content: trimmed }
    const newConversation = [...conversation, userMessage]
    onUpdate({ dreamConversation: newConversation })

    setIsLoading(true)
    setStreamingText('')
    let accumulated = ''

    await streamChat('dream', newConversation, {
      onDelta(text) {
        accumulated += text
        setStreamingText(accumulated)
      },
      onDone() {
        const assistantMessage = { role: 'assistant' as const, content: accumulated }
        const finalConversation = [...newConversation, assistantMessage]
        const plan = isPlan(accumulated) ? accumulated : null
        onUpdate({
          dreamConversation: finalConversation,
          ...(plan ? { dreamPlan: plan } : {}),
        })
        setStreamingText('')
        setIsLoading(false)
      },
      onError(message) {
        setError(message)
        setStreamingText('')
        setIsLoading(false)
      },
    })
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-4xl">💭</span>
          <div>
            <h2 className="text-2xl font-extrabold text-purple-700">Dream It</h2>
            <p className="text-gray-500 text-sm">Tell us what app you want to make!</p>
          </div>
        </div>

        {/* Conversation history */}
        <div className="space-y-3 mb-4 max-h-80 overflow-y-auto">
          {conversation.length === 0 && (
            <div className="text-center py-6 text-gray-400">
              <p className="text-5xl mb-2">🌟</p>
              <p className="font-bold text-gray-500">What do you want to build today?</p>
              <p className="text-sm mt-1">Type your idea below and press Enter!</p>
            </div>
          )}

          {conversation.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={[
                  'max-w-[80%] rounded-2xl px-4 py-3 text-base font-medium',
                  msg.role === 'user'
                    ? 'bg-purple-500 text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-800 rounded-bl-sm',
                ].join(' ')}
              >
                <p className="whitespace-pre-wrap font-sans">{renderMarkdown(msg.content)}</p>
              </div>
            </div>
          ))}

          {/* Streaming response */}
          {streamingText && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-2xl rounded-bl-sm px-4 py-3 bg-gray-100 text-gray-800">
                <p className="whitespace-pre-wrap font-sans streaming-text">{renderMarkdown(streamingText)}</p>
              </div>
            </div>
          )}

          {isLoading && !streamingText && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-5 py-3">
                <span className="inline-flex gap-1">
                  <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-3 text-red-700 text-sm font-medium mb-3">
            {error}
          </div>
        )}

        {/* Plan preview */}
        {hasPlan && !isLoading && (
          <div className="bg-purple-50 border-2 border-purple-300 rounded-2xl p-4 mb-3">
            <p className="font-extrabold text-purple-700 text-sm mb-1">✅ Your app plan is ready!</p>
            <pre className="text-sm text-purple-800 whitespace-pre-wrap font-sans">{session.dreamPlan}</pre>
          </div>
        )}

        {/* Input area */}
        {!hasPlan && (
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="I want to make a quiz game about animals..."
              className="input-field resize-none h-16"
              disabled={isLoading}
              rows={2}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="btn-primary px-5 self-end"
            >
              Send
            </button>
          </div>
        )}

        <FactBubble visible={isLoading} />
      </div>

      {/* Next button */}
      {hasPlan && (
        <div className="flex justify-end">
          <button onClick={onNext} className="btn-primary">
            Build It! 🔨
          </button>
        </div>
      )}

      {/* Allow re-dreaming */}
      {hasPlan && (
        <div className="flex justify-start">
          <button
            onClick={() => {
              onUpdate({ dreamConversation: [], dreamPlan: null })
              setError(null)
            }}
            className="btn-secondary text-sm py-2 px-4"
          >
            Start over with a different idea
          </button>
        </div>
      )}
    </div>
  )
}
