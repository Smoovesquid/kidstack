/**
 * PremiseCards — shows the AI's list of options/premises as large tappable cards.
 *
 * Detection: if the last AI message contains 2–6 lines that start with an emoji
 * or "Option X:", we surface them here so the kid can tap instead of type.
 */

/** Parse a block of AI text for quick-reply options. */
export function parseQuickReplies(text: string): string[] {
  const lines = text.split('\n')
  const replies: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    // Match emoji-prefixed options: "🎯 Some text here"
    // Unicode emoji range heuristic: first char code > 127 and second char is space
    const firstChar = trimmed.codePointAt(0) ?? 0
    const afterEmoji = trimmed.slice([...trimmed].slice(0, 2).join('').length).trimStart()
    if (firstChar > 127 && afterEmoji.length > 5 && trimmed.length < 120) {
      replies.push(trimmed)
      continue
    }

    // Match "Option A:", "Option B:", numbered items "1.", "2.", "3."
    if (/^(option [a-z]:|\d+\.)\s+.{5,}/i.test(trimmed) && trimmed.length < 120) {
      replies.push(trimmed)
    }
  }

  // Only treat as a choice list if there are 2–6 options
  return replies.length >= 2 && replies.length <= 6 ? replies : []
}

interface Props {
  options: string[]
  onSelect: (text: string) => void
}

const CARD_COLORS = [
  'from-purple-400 to-indigo-400',
  'from-blue-400 to-cyan-400',
  'from-orange-400 to-amber-400',
  'from-pink-400 to-rose-400',
  'from-yellow-400 to-lime-400',
  'from-green-400 to-teal-400',
]

export function PremiseCards({ options, onSelect }: Props) {
  if (options.length === 0) return null

  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide px-1">
        Tap one to reply 👇
      </p>
      <div className="grid grid-cols-1 gap-2">
        {options.map((opt, i) => (
          <button
            key={i}
            onClick={() => onSelect(opt)}
            className={`bg-gradient-to-r ${CARD_COLORS[i % CARD_COLORS.length]} text-white font-bold text-left px-5 py-4 rounded-2xl shadow-md hover:shadow-lg active:scale-95 transition-all duration-150 text-base leading-snug`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}

/** Thumbs-up/down variant for premise confirmation */
interface PremiseConfirmProps {
  premise: string
  onThumbsUp: () => void
  onThumbsDown: () => void
}

export function PremiseConfirmCard({ premise, onThumbsUp, onThumbsDown }: PremiseConfirmProps) {
  return (
    <div className="bg-white border-2 border-indigo-200 rounded-3xl p-5 shadow-md space-y-3">
      <p className="text-gray-800 font-medium text-base leading-relaxed">{premise}</p>
      <div className="flex gap-3">
        <button
          onClick={onThumbsUp}
          className="flex-1 bg-green-100 hover:bg-green-200 active:scale-95 text-green-700 font-extrabold text-2xl py-3 rounded-2xl transition-all"
          aria-label="Agree"
        >
          👍
        </button>
        <button
          onClick={onThumbsDown}
          className="flex-1 bg-red-100 hover:bg-red-200 active:scale-95 text-red-700 font-extrabold text-2xl py-3 rounded-2xl transition-all"
          aria-label="Disagree"
        >
          👎
        </button>
      </div>
    </div>
  )
}
