export interface SkillOption {
  id: string
  emoji: string
  label: string
  description: string
  color: string      // Tailwind bg class for card accent
  textColor: string  // Tailwind text class for label
}

export const SKILLS: SkillOption[] = [
  {
    id: 'office-hours-kid',
    emoji: '💭',
    label: 'Dream It Up',
    description: 'Figure out what to build and why it\'s a great idea',
    color: 'from-purple-400 to-indigo-400',
    textColor: 'text-purple-700',
  },
  {
    id: 'plan-ceo-review-kid',
    emoji: '👔',
    label: 'Boss Check',
    description: 'Make sure your plan is solid before you start',
    color: 'from-blue-400 to-cyan-400',
    textColor: 'text-blue-700',
  },
  {
    id: 'plan-eng-review-kid',
    emoji: '🔧',
    label: 'Builder Check',
    description: 'Find out if your app can actually be built',
    color: 'from-orange-400 to-amber-400',
    textColor: 'text-orange-700',
  },
  {
    id: 'plan-design-review-kid',
    emoji: '🎨',
    label: 'Pretty Check',
    description: 'See if your design looks amazing to everyone',
    color: 'from-pink-400 to-rose-400',
    textColor: 'text-pink-700',
  },
  {
    id: 'design-consultation-kid',
    emoji: '✨',
    label: 'Style Guide',
    description: 'Pick the perfect colors, fonts, and vibe',
    color: 'from-yellow-400 to-lime-400',
    textColor: 'text-yellow-700',
  },
  {
    id: 'design-shotgun-kid',
    emoji: '🎉',
    label: 'Design Party',
    description: 'See lots of design ideas all at once',
    color: 'from-green-400 to-teal-400',
    textColor: 'text-green-700',
  },
]

interface Props {
  onSelect: (skill: SkillOption) => void
  onBack: () => void
}

export function SkillPicker({ onSelect, onBack }: Props) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-4">
      {/* Header */}
      <div className="max-w-2xl mx-auto pt-6 pb-2">
        <button
          onClick={onBack}
          className="text-indigo-400 hover:text-indigo-600 font-bold text-sm mb-4 flex items-center gap-1 transition-colors"
        >
          ← Back
        </button>
        <div className="text-center mb-6">
          <p className="text-5xl mb-2">🧱</p>
          <h2 className="text-3xl font-extrabold text-indigo-700">Pick a skill!</h2>
          <p className="text-gray-500 mt-1">What do you want the AI to help you with?</p>
        </div>
      </div>

      {/* Skill cards grid */}
      <div className="max-w-2xl mx-auto grid grid-cols-2 gap-4 pb-8">
        {SKILLS.map((skill) => (
          <button
            key={skill.id}
            onClick={() => onSelect(skill)}
            className="bg-white rounded-3xl shadow-md hover:shadow-xl active:scale-95 transition-all duration-150 overflow-hidden text-left border-2 border-transparent hover:border-indigo-200"
          >
            {/* Color bar at top */}
            <div className={`h-2 w-full bg-gradient-to-r ${skill.color}`} />
            <div className="p-5">
              <span className="text-5xl block mb-2">{skill.emoji}</span>
              <h3 className={`text-lg font-extrabold ${skill.textColor} mb-1`}>
                {skill.label}
              </h3>
              <p className="text-gray-500 text-sm leading-snug">{skill.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
