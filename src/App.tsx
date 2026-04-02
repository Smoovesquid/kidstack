import { useState } from 'react'
import { getStoredApiKey, setStoredApiKey } from './lib/api'
import { BYOKOnboarding } from './components/BYOKOnboarding'
import { EntryScreen } from './components/EntryScreen'
import { SkillPicker } from './components/SkillPicker'
import type { SkillOption } from './components/SkillPicker'
import { ChatScreen } from './components/ChatScreen'
import type { ChatMessage } from './components/ChatScreen'
import { AchievementScreen } from './components/AchievementScreen'
import { BuildPreview } from './components/BuildPreview'

type Screen = 'entry' | 'onboarding' | 'skill-picker' | 'chat' | 'achievement' | 'build'

export default function App() {
  const [apiKey, setApiKey] = useState<string | null>(() => getStoredApiKey())
  const [screen, setScreen] = useState<Screen>('entry')
  const [selectedSkill, setSelectedSkill] = useState<SkillOption | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [skillOutput, setSkillOutput] = useState('')
  const [totalCost, setTotalCost] = useState(0)

  // Derive app name from skill output (first NAME: line), fallback to skill label
  const appName = (() => {
    const match = skillOutput.match(/^NAME:\s*(.+)/im)
    return match?.[1]?.trim() ?? selectedSkill?.label ?? 'My App'
  })()

  // --- BYOK onboarding ---
  if (screen === 'onboarding' || (!apiKey && screen !== 'entry')) {
    return (
      <BYOKOnboarding
        onComplete={(key) => {
          setStoredApiKey(key)
          setApiKey(key)
          setScreen('skill-picker')
        }}
      />
    )
  }

  // --- Entry ---
  if (screen === 'entry') {
    return (
      <EntryScreen
        onStart={() => {
          if (!apiKey) {
            setScreen('onboarding')
          } else {
            setScreen('skill-picker')
          }
        }}
      />
    )
  }

  // --- Skill picker ---
  if (screen === 'skill-picker') {
    return (
      <SkillPicker
        onSelect={(skill) => {
          setSelectedSkill(skill)
          setMessages([])
          setSkillOutput('')
          setScreen('chat')
        }}
        onBack={() => setScreen('entry')}
      />
    )
  }

  // --- Chat ---
  if (screen === 'chat' && selectedSkill) {
    return (
      <ChatScreen
        skill={selectedSkill.id}
        skillLabel={selectedSkill.label}
        skillEmoji={selectedSkill.emoji}
        messages={messages}
        totalCost={totalCost}
        onAddMessages={(newMsgs) => {
          setMessages((prev) => [...prev, ...newMsgs])
        }}
        onAddCost={(dollars) => {
          setTotalCost((prev) => prev + dollars)
        }}
        onFinish={(output) => {
          setSkillOutput(output)
          setScreen('achievement')
        }}
        onBack={() => setScreen('skill-picker')}
      />
    )
  }

  // --- Achievement ---
  if (screen === 'achievement' && selectedSkill) {
    return (
      <AchievementScreen
        skillLabel={selectedSkill.label}
        skillEmoji={selectedSkill.emoji}
        output={skillOutput}
        totalCost={totalCost}
        onBuildIt={() => setScreen('build')}
        onNewSkill={() => setScreen('skill-picker')}
      />
    )
  }

  // --- Build preview ---
  if (screen === 'build') {
    return (
      <BuildPreview
        skillOutput={skillOutput}
        appName={appName}
        totalCost={totalCost}
        onBack={() => setScreen('skill-picker')}
      />
    )
  }

  // Fallback
  return null
}
