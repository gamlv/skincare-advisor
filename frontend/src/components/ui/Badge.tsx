// カテゴリ・悩みタグなどのバッジコンポーネント

type Color = "pink" | "purple" | "blue" | "green" | "yellow" | "gray"

interface BadgeProps {
  label: string
  color?: Color
}

const colorClasses: Record<Color, string> = {
  pink: "bg-pink-100 text-pink-700",
  purple: "bg-purple-100 text-purple-700",
  blue: "bg-blue-100 text-blue-700",
  green: "bg-green-100 text-green-700",
  yellow: "bg-yellow-100 text-yellow-700",
  gray: "bg-gray-100 text-gray-600",
}

// カテゴリごとの色を返す
export function categoryColor(category: string): Color {
  const map: Record<string, Color> = {
    洗顔: "blue",
    化粧水: "purple",
    美容液: "pink",
    乳液: "green",
    クリーム: "yellow",
    日焼け止め: "blue",
    その他: "gray",
  }
  return map[category] ?? "gray"
}

export function Badge({ label, color = "gray" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colorClasses[color]}`}
    >
      {label}
    </span>
  )
}
