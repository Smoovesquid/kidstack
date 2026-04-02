import { useEffect, useRef } from 'react'

interface Props {
  skillLabel: string
  skillEmoji: string
  output: string
  totalCost: number
  onBuildIt: () => void
  onNewSkill: () => void
}

/** Inline confetti burst using CSS animation */
function Confetti() {
  const PIECES = ['🎊', '⭐', '🌟', '✨', '🎉', '💫', '🏆', '🎈']
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {Array.from({ length: 16 }, (_, i) => (
        <span
          key={i}
          className="absolute text-2xl"
          style={{
            left: `${(i * 6.25) % 100}%`,
            top: '-2rem',
            animation: `confetti-fall ${1.2 + (i % 4) * 0.3}s ease-in ${(i % 6) * 0.15}s forwards`,
          }}
        >
          {PIECES[i % PIECES.length]}
        </span>
      ))}
      <style>{`
        @keyframes confetti-fall {
          0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  )
}

/** Render **bold** inline markdown safely as React nodes */
function renderMd(text: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : part,
  )
}

export function AchievementScreen({ skillLabel, skillEmoji, output, totalCost, onBuildIt, onNewSkill }: Props) {
  const topRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-pink-50 p-4 relative">
      <Confetti />

      <div className="max-w-2xl mx-auto pt-6 relative z-10" ref={topRef}>
        {/* Trophy header */}
        <div className="text-center mb-6">
          <div className="text-8xl mb-3">🏆</div>
          <h2 className="text-4xl font-extrabold text-orange-600 mb-1">You did it!</h2>
          <p className="text-lg text-orange-400 font-bold">
            {skillEmoji} {skillLabel} — complete!
          </p>
        </div>

        {/* Stars row */}
        <div className="flex justify-center gap-2 mb-6 text-3xl" aria-hidden>
          {['⭐', '⭐', '⭐', '⭐', '⭐'].map((s, i) => (
            <span
              key={i}
              style={{ animation: `star-pop 0.4s ease-out ${i * 0.1}s both` }}
            >
              {s}
            </span>
          ))}
        </div>

        {/* Output doc */}
        <div className="bg-white rounded-3xl shadow-lg border-4 border-orange-200 p-6 mb-5">
          <p className="text-xs font-extrabold text-orange-400 uppercase tracking-widest mb-3">
            Your real plan 📄
          </p>
          <div className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap font-sans max-h-80 overflow-y-auto">
            {output.split('\n').map((line, i) => (
              <p key={i} className={line.trim() === '' ? 'mb-2' : 'mb-0'}>
                {renderMd(line)}
              </p>
            ))}
          </div>
        </div>

        {/* Cost display */}
        {totalCost > 0 && (
          <div className="bg-indigo-50 border-2 border-indigo-200 rounded-2xl px-5 py-3 mb-5 flex items-center gap-3">
            <span className="text-2xl">🪙</span>
            <p className="text-sm text-indigo-700">
              This session used{' '}
              <span className="font-extrabold">${totalCost.toFixed(4)}</span> of AI power
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={onBuildIt}
            className="btn-primary w-full text-xl py-5 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 border-0"
          >
            Build It! 🚀
          </button>
          <button
            onClick={onNewSkill}
            className="btn-secondary w-full"
          >
            Try another skill ✨
          </button>
        </div>
      </div>

      <style>{`
        @keyframes star-pop {
          0%   { transform: scale(0) rotate(-30deg); opacity: 0; }
          70%  { transform: scale(1.3) rotate(10deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg);   opacity: 1; }
        }
      `}</style>
    </div>
  )
}
