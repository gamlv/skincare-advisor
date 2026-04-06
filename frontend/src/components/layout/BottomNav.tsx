// ボトムナビゲーションコンポーネント（スマホ親指操作に最適化）

type Page = "products" | "add" | "routine"

interface BottomNavProps {
  current: Page
  onChange: (page: Page) => void
}

const NAV_ITEMS: { page: Page; icon: string; label: string }[] = [
  { page: "products", icon: "🧴", label: "製品一覧" },
  { page: "add", icon: "➕", label: "追加" },
  { page: "routine", icon: "✨", label: "ルーティン" },
]

export function BottomNav({ current, onChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-10 bg-white border-t border-gray-100 safe-area-pb">
      <div className="flex">
        {NAV_ITEMS.map(({ page, icon, label }) => (
          <button
            key={page}
            onClick={() => onChange(page)}
            className={[
              "flex flex-1 flex-col items-center justify-center gap-1 py-3 text-xs transition-colors",
              current === page
                ? "text-pink-500 font-medium"
                : "text-gray-400 hover:text-gray-600",
            ].join(" ")}
          >
            <span className="text-xl leading-none">{icon}</span>
            <span>{label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}
