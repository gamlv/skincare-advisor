// NGペア警告を表示するコンポーネント

import type { RoutineWarning as Warning } from "../../types"

interface RoutineWarningProps {
  warnings: Warning[]
}

export function RoutineWarning({ warnings }: RoutineWarningProps) {
  if (warnings.length === 0) return null

  return (
    <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
      <div className="flex items-start gap-2 mb-3">
        <span className="text-lg">⚠️</span>
        <div>
          <p className="text-sm font-semibold text-amber-800">成分の競合を検出しました</p>
          <p className="text-xs text-amber-600 mt-0.5">以下の製品は同じルーティンでの使用を避けることをお勧めします</p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {warnings.map((w, i) => (
          <div key={i} className="rounded-lg bg-white border border-amber-100 p-3">
            <p className="text-sm font-medium text-gray-800">
              {w.product_a} × {w.product_b}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {w.ng_pairs.map(([a, b], j) => (
                <span
                  key={j}
                  className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700"
                >
                  {a} × {b}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
