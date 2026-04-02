interface Props {
  onStart: () => void
}

export function EntryScreen({ onStart }: Props) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100">
      {/* Duck mascot */}
      <div
        className="text-8xl mb-6 select-none"
        style={{ animation: 'duck-bob 2s ease-in-out infinite' }}
        role="img"
        aria-label="Friendly duck mascot"
      >
        🦆
      </div>

      {/* Title */}
      <h1 className="text-5xl font-extrabold text-indigo-700 mb-2 text-center drop-shadow-sm">
        KidStack
      </h1>
      <p className="text-xl text-purple-500 font-bold mb-12 text-center">
        Turn your idea into a real app!
      </p>

      {/* Big CTA */}
      <button
        onClick={onStart}
        className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 active:scale-95 text-white font-extrabold text-2xl py-6 px-12 rounded-3xl shadow-2xl transition-all duration-150 border-4 border-white/30"
      >
        I have an idea! 💡
      </button>

      <p className="text-gray-400 text-sm mt-8 text-center">
        No coding needed&nbsp;&nbsp;•&nbsp;&nbsp;Powered by Claude AI
      </p>

      <style>{`
        @keyframes duck-bob {
          0%, 100% { transform: translateY(0) rotate(-3deg); }
          50% { transform: translateY(-14px) rotate(3deg); }
        }
      `}</style>
    </div>
  )
}
