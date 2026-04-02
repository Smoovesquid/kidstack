interface Props {
  totalCost: number
}

export function CostMeter({ totalCost }: Props) {
  if (totalCost === 0) return null
  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white border-2 border-indigo-200 rounded-2xl px-4 py-2 shadow-lg text-sm flex items-center gap-2">
      <span className="text-lg">🪙</span>
      <div>
        <span className="text-gray-500 text-xs block leading-none">Session cost</span>
        <span className="font-extrabold text-indigo-700">${totalCost.toFixed(4)}</span>
      </div>
    </div>
  )
}
