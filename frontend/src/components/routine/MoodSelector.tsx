// 気分モード選択コンポーネント

import type { Mood } from "../../types"

interface MoodSelectorProps {
  selected: Mood | null
  onChange: (mood: Mood) => void
}

const MOODS: {
  mood: Mood
  icon: string
  label: string
  description: string
}[] = [
  {
    mood: "refresh",
    icon: "🌿",
    label: "リフレッシュ",
    description: "さっぱり・軽めのケア",
  },
  {
    mood: "relax",
    icon: "🛁",
    label: "リラックス",
    description: "保湿重視・じっくりケア",
  },
  {
    mood: "thorough",
    icon: "💎",
    label: "しっかりケア",
    description: "フル工程・全製品使用",
  },
  {
    mood: "quick",
    icon: "⚡",
    label: "時短",
    description: "最小手順・必須ケアのみ",
  },
  {
    mood: "sensitive",
    icon: "🌸",
    label: "肌荒れ",
    description: "低刺激・優しいケア",
  },
]

export function MoodSelector({ selected, onChange }: MoodSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {MOODS.map(({ mood, icon, label, description }) => (
        <button
          key={mood}
          onClick={() => onChange(mood)}
          className={[
            "rounded-2xl p-4 text-left transition-all border",
            selected === mood
              ? "bg-pink-50 border-pink-300 shadow-sm"
              : "bg-white border-gray-100 hover:border-pink-200 hover:shadow-sm",
          ].join(" ")}
        >
          <span className="mb-2 block text-2xl">{icon}</span>
          <p
            className={`text-sm font-semibold ${selected === mood ? "text-pink-600" : "text-gray-800"}`}
          >
            {label}
          </p>
          <p className="mt-0.5 text-xs text-gray-400">{description}</p>
        </button>
      ))}
    </div>
  )
}
