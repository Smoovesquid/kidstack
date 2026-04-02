import { useEffect, useRef, useState } from 'react'
import { streamSkill, calcCost } from '../lib/skillApi'
import { PremiseCards, parseQuickReplies } from './PremiseCards'
import { CostMeter } from './CostMeter'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  /** Hidden kickoff messages aren't displayed, but are included in API calls */
  hidden?: boolean
}

interface Props {
  skill: string
  skillLabel: string
  skillEmoji: string
  messages: ChatMessage[]
  totalCost: number
  onAddMessages: (msgs: ChatMessage[]) => void
  onAddCost: (dollars: number) => void
  onFinish: (output: string) => void
  onBack: () => void
}

/** Render **bold** inline markdown safely */
function renderMd(text: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : part,
  )
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-5 py-4">
        <span className="inline-flex gap-1.5 items-center">
          <span className="w-2.5 h-2.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2.5 h-2.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2.5 h-2.5 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </span>
      </div>
    </div>
  )
}

export function ChatScreen({
  skill,
  skillLabel,
  skillEmoji,
  messages,
  totalCost,
  onAddMessages,
  onAddCost,
  onFinish,
  onBack,
}: Props) {
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const hasAnyAiMessage = messages.some((m) => m.role === 'assistant')
  const visibleMessages = messages.filter((m) => !m.hidden)

  // Last AI message — used to extract quick-reply options
  const lastAiMsg = [...messages].reverse().find((m) => m.role === 'assistant')
  const quickReplies = !isLoading && lastAiMsg ? parseQuickReplies(lastAiMsg.content) : []

  // Auto-scroll on new content
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [visibleMessages, streamingText])

  // Auto-start: kick off the conversation when the screen first loads
  useEffect(() => {
    if (messages.length === 0) {
      sendMessage("Hi! I'm ready to get started! 🚀", true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function sendMessage(text: string, isKickoff = false) {
    if (isLoading) return
    setError(null)
    setInput('')

    const userMsg: ChatMessage = { role: 'user', content: text, hidden: isKickoff }
    const newMessages = [...messages, userMsg]
    onAddMessages([userMsg])

    setIsLoading(true)
    setStreamingText('')
    let accumulated = ''
    let inputTok = 0
    let outputTok = 0

    // Strip hidden flag before sending to API
    const apiMessages = newMessages.map(({ role, content }) => ({ role, content }))

    await streamSkill(skill, apiMessages, {
      onText(chunk) {
        accumulated += chunk
        setStreamingText(accumulated)
      },
      onTokens(inp, out) {
        inputTok = inp
        outputTok = out
      },
      onDone() {
        const aiMsg: ChatMessage = { role: 'assistant', content: accumulated }
        onAddMessages([aiMsg])
        onAddCost(calcCost(inputTok, outputTok))
        setStreamingText('')
        setIsLoading(false)
        // Re-focus input for next message
        setTimeout(() => inputRef.current?.focus(), 50)
      },
      onError(_code, message) {
        setError(message)
        setStreamingText('')
        setIsLoading(false)
      },
    })
  }

  function handleSend() {
    const trimmed = input.trim()
    if (!trimmed || isLoading) return
    sendMessage(trimmed)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleFinish() {
    // Use the last AI message as the output doc
    const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant')
    onFinish(lastAssistant?.content ?? '')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-purple-50 flex flex-col">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur sticky top-0 z-10 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={onBack}
            disabled={isLoading}
            className="text-indigo-400 hover:text-indigo-600 font-bold text-sm flex items-center gap-1 transition-colors disabled:opacity-40"
          >
            ← Skills
          </button>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{skillEmoji}</span>
            <h2 className="text-lg font-extrabold text-indigo-700">{skillLabel}</h2>
          </div>
          <div className="w-16" />
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto px-4 py-4 max-w-2xl mx-auto w-full">
        <div className="space-y-3 pb-2">
          {/* Empty state while auto-starting */}
          {visibleMessages.length === 0 && !streamingText && (
            <div className="flex justify-center py-8">
              <TypingIndicator />
            </div>
          )}

          {visibleMessages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <span className="text-2xl mr-2 mt-1 select-none" aria-hidden>🦆</span>
              )}
              <div
                className={[
                  'max-w-[78%] rounded-3xl px-5 py-3 text-base font-medium leading-relaxed shadow-sm',
                  msg.role === 'user'
                    ? 'bg-gradient-to-br from-indigo-500 to-purple-500 text-white rounded-br-sm'
                    : 'bg-white text-gray-800 rounded-bl-sm border border-gray-100',
                ].join(' ')}
              >
                <p className="whitespace-pre-wrap font-sans">{renderMd(msg.content)}</p>
              </div>
            </div>
          ))}

          {/* Streaming bubble */}
          {streamingText && (
            <div className="flex justify-start">
              <span className="text-2xl mr-2 mt-1 select-none" aria-hidden>🦆</span>
              <div className="max-w-[78%] rounded-3xl rounded-bl-sm px-5 py-3 bg-white text-gray-800 shadow-sm border border-gray-100">
                <p className="whitespace-pre-wrap font-sans streaming-text">{renderMd(streamingText)}</p>
              </div>
            </div>
          )}

          {/* Typing indicator (before first text arrives) */}
          {isLoading && !streamingText && visibleMessages.length > 0 && (
            <TypingIndicator />
          )}

          {/* Quick reply cards */}
          {quickReplies.length > 0 && (
            <PremiseCards
              options={quickReplies}
              onSelect={(text) => sendMessage(text)}
            />
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Error banner */}
      {error && (
        <div className="max-w-2xl mx-auto w-full px-4">
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-3 text-red-700 text-sm font-medium mb-2 flex items-center justify-between gap-3">
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-600 font-bold text-lg leading-none"
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* "I'm done!" button — shown after first AI response */}
      {hasAnyAiMessage && !isLoading && (
        <div className="max-w-2xl mx-auto w-full px-4 py-2">
          <button
            onClick={handleFinish}
            className="w-full bg-gradient-to-r from-orange-400 to-pink-400 hover:from-orange-500 hover:to-pink-500 active:scale-95 text-white font-extrabold text-base py-3 rounded-2xl shadow-md transition-all duration-150"
          >
            Finish & See My Plan! 🎉
          </button>
        </div>
      )}

      {/* Input area */}
      <div className="sticky bottom-0 bg-white/95 backdrop-blur border-t border-gray-100 px-4 py-3 max-w-2xl mx-auto w-full">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message…"
            className="input-field resize-none h-14 text-base leading-relaxed flex-1"
            disabled={isLoading}
            rows={2}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="btn-primary px-5 py-4 self-end"
            aria-label="Send message"
          >
            Send
          </button>
        </div>
      </div>

      {/* Persistent cost meter */}
      <CostMeter totalCost={totalCost} />
    </div>
  )
}
