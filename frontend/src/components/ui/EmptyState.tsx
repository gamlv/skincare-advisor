// 空状態の案内コンポーネント

interface EmptyStateProps {
  icon?: string
  message: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({
  icon = "🧴",
  message,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16">
      <span className="text-5xl">{icon}</span>
      <p className="text-center text-sm text-gray-500">{message}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-1 rounded-xl bg-pink-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-pink-600 transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
