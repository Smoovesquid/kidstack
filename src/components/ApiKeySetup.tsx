import { useState } from 'react'

interface Props {
  onSave: (key: string) => void
}

export function ApiKeySetup({ onSave }: Props) {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed.startsWith('sk-ant-')) {
      setError('That doesn\'t look right — Anthropic keys start with "sk-ant-"')
      return
    }
    onSave(trimmed)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-indigo-50 to-purple-50">
      <div className="card max-w-lg w-full space-y-6">
        {/* Icon + title */}
        <div className="text-center space-y-2">
          <p className="text-6xl">🔑</p>
          <h1 className="text-3xl font-extrabold text-indigo-700">KidStack Setup</h1>
          <p className="text-gray-500 text-sm">One-time setup — takes 30 seconds</p>
        </div>

        {/* Explanation */}
        <div className="bg-indigo-50 border-2 border-indigo-200 rounded-2xl p-4 space-y-2 text-sm text-indigo-800">
          <p className="font-bold">KidStack needs an Anthropic API key to power the AI.</p>
          <ol className="list-decimal list-inside space-y-1 text-indigo-700">
            <li>Go to <span className="font-mono font-bold">console.anthropic.com</span></li>
            <li>Sign in and click <strong>API Keys</strong></li>
            <li>Click <strong>Create Key</strong>, copy it, paste below</li>
          </ol>
          <p className="text-xs text-indigo-500 pt-1">
            Your key is saved only in this browser. You'll need to re-enter it if you clear browser data.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">
              Anthropic API Key
            </label>
            <input
              type="password"
              value={value}
              onChange={(e) => { setValue(e.target.value); setError('') }}
              placeholder="sk-ant-api03-..."
              className="w-full border-2 border-indigo-200 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-indigo-500 bg-white"
              autoFocus
            />
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
          </div>
          <button
            type="submit"
            disabled={!value.trim()}
            className="btn-primary w-full disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Save Key &amp; Start Building 🚀
          </button>
        </form>

        {/* Change key link placeholder — shown after key is set (handled by parent) */}
      </div>
    </div>
  )
}
