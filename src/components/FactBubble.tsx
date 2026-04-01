import { useEffect, useState } from 'react'
import { getRandomFact } from '../lib/facts'

interface Props {
  visible: boolean
}

export function FactBubble({ visible }: Props) {
  const [fact, setFact] = useState(() => getRandomFact())
  const [lastFact, setLastFact] = useState<string | undefined>(undefined)

  // Rotate facts every 8 seconds while visible
  useEffect(() => {
    if (!visible) return
    const id = setInterval(() => {
      setFact((prev) => {
        const next = getRandomFact(prev)
        setLastFact(prev)
        return next
      })
    }, 8000)
    return () => clearInterval(id)
  }, [visible])

  // Pick a new fact when becoming visible
  useEffect(() => {
    if (visible) setFact(getRandomFact(lastFact))
  }, [visible]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!visible) return null

  return (
    <div className="mt-4 bg-indigo-50 border-2 border-indigo-200 rounded-2xl p-4 text-sm text-indigo-800 animate-pulse-slow">
      <span className="font-extrabold text-indigo-500">💡 Did you know? </span>
      {fact}
    </div>
  )
}
