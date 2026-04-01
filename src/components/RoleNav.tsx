import type { AppSession } from '../lib/session'

type Step = AppSession['step']

const ROLES: { id: Step; emoji: string; label: string; color: string; activeColor: string }[] = [
  { id: 'dream', emoji: '💭', label: 'Dream It', color: 'bg-purple-100 text-purple-600', activeColor: 'bg-purple-500 text-white' },
  { id: 'build', emoji: '🔨', label: 'Build It', color: 'bg-blue-100 text-blue-600', activeColor: 'bg-blue-500 text-white' },
  { id: 'check', emoji: '🔍', label: 'Check It', color: 'bg-yellow-100 text-yellow-700', activeColor: 'bg-yellow-500 text-white' },
  { id: 'show', emoji: '🚀', label: 'Show It', color: 'bg-green-100 text-green-600', activeColor: 'bg-green-500 text-white' },
]

interface Props {
  current: Step
  unlocked: Set<Step>
  onNavigate: (step: Step) => void
}

export function RoleNav({ current, unlocked, onNavigate }: Props) {
  return (
    <nav className="flex gap-2 sm:gap-3 justify-center flex-wrap">
      {ROLES.map((role) => {
        const isActive = role.id === current
        const isUnlocked = unlocked.has(role.id)
        const isClickable = isUnlocked && !isActive

        return (
          <button
            key={role.id}
            onClick={() => isClickable && onNavigate(role.id)}
            disabled={!isUnlocked}
            className={[
              'flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-3 rounded-2xl font-bold text-xs sm:text-base transition-all duration-200',
              isActive ? role.activeColor + ' shadow-md scale-105' : '',
              !isActive && isUnlocked ? role.color + ' hover:scale-105 hover:shadow-sm cursor-pointer' : '',
              !isUnlocked ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-60' : '',
            ].join(' ')}
            aria-current={isActive ? 'step' : undefined}
          >
            <span className="text-lg sm:text-xl">{role.emoji}</span>
            <span>{role.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
