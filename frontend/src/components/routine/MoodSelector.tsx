// 気分モード選択コンポーネント（複数選択可・最大3つ）

import type { Mood } from "../../types"

const MAX_SELECTION = 3

interface MoodSelectorProps {
  selected: Mood[]
  onChange: (moods: Mood[]) => void
}

const MOODS: {
  mood: Mood
  icon: string
  label: string
  description: string
}[] = [
  {
    mood: "morning",
    icon: "🌅",
    label: "朝ケア",
    description: "日焼け止め必須・軽めで準備",
  },
  {
    mood: "night",
    icon: "🌙",
    label: "夜ケア",
    description: "美容液・クリーム重ね・高濃度OK",
  },
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
  {
    mood: "brightening",
    icon: "✨",
    label: "美白ケア",
    description: "ビタミンC・ナイアシンアミド優先",
  },
  {
    mood: "antiaging",
    icon: "🕰️",
    label: "エイジングケア",
    description: "レチノール・ペプチド・ハリ重視",
  },
  {
    mood: "pore",
    icon: "🔬",
    label: "毛穴ケア",
    description: "BHA・皮脂コントロール重視",
  },
]

export function MoodSelector({ selected, onChange }: MoodSelectorProps) {
  const toggle = (mood: Mood) => {
    if (selected.includes(mood)) {
      // 選択済みなら外す
      onChange(selected.filter((m) => m !== mood))
    } else if (selected.length < MAX_SELECTION) {
      // 上限未満なら追加
      onChange([...selected, mood])
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-gray-400">
        最大{MAX_SELECTION}つまで組み合わせ可能
        {selected.length > 0 && (
          <span className="ml-2 text-pink-500 font-medium">
            {selected.length}つ選択中
          </span>
        )}
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {MOODS.map(({ mood, icon, label, description }, index) => {
          const isSelected = selected.includes(mood)
          const order = selected.indexOf(mood)
          const isDisabled = !isSelected && selected.length >= MAX_SELECTION

          return (
            <button
              key={mood}
              onClick={() => toggle(mood)}
              disabled={isDisabled}
              className={[
                "relative rounded-2xl p-4 text-left transition-all border",
                isSelected
                  ? "bg-pink-50 border-pink-300 shadow-sm"
                  : isDisabled
                  ? "bg-gray-50 border-gray-100 opacity-40 cursor-not-allowed"
                  : "bg-white border-gray-100 hover:border-pink-200 hover:shadow-sm",
              ].join(" ")}
            >
              {/* 選択順バッジ */}
              {isSelected && (
                <span className="absolute top-2 right-2 flex items-center justify-center w-5 h-5 rounded-full bg-pink-500 text-white text-xs font-bold">
                  {order + 1}
                </span>
              )}
              <span className="mb-2 block text-2xl">{icon}</span>
              <p className={`text-sm font-semibold ${isSelected ? "text-pink-600" : "text-gray-800"}`}>
                {label}
              </p>
              <p className="mt-0.5 text-xs text-gray-400">{description}</p>
            </button>
          )
        })}
      </div>
    </div>
  )
}
