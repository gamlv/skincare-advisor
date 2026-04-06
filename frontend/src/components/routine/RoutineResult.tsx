// ルーティン提案結果全体の表示コンポーネント

import { RoutineStep } from "./RoutineStep"
import { RoutineWarning } from "./RoutineWarning"
import type { RoutineResponse } from "../../types"

interface RoutineResultProps {
  result: RoutineResponse
  onReset: () => void
}

export function RoutineResult({ result, onReset }: RoutineResultProps) {
  return (
    <div className="flex flex-col gap-5">
      {/* ヘッダー */}
      <div className="rounded-2xl bg-gradient-to-br from-pink-50 to-purple-50 p-5">
        <p className="text-xs font-medium text-pink-500 mb-1">今日の気分：{result.mood_label}</p>
        {result.notes && (
          <p className="text-sm text-gray-700 leading-relaxed">{result.notes}</p>
        )}
      </div>

      {/* NGペア警告 */}
      {result.warnings.length > 0 && (
        <RoutineWarning warnings={result.warnings} />
      )}

      {/* ステップ一覧 */}
      <div>
        <p className="mb-3 text-xs font-medium text-gray-400">スキンケアの手順</p>
        {result.steps.length > 0 ? (
          <div className="flex flex-col gap-4">
            {result.steps.map((step) => (
              <RoutineStep key={step.order} step={step} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-4">
            提案できるステップがありませんでした
          </p>
        )}
      </div>

      {/* やり直しボタン */}
      <button
        onClick={onReset}
        className="w-full rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors"
      >
        気分を選び直す
      </button>
    </div>
  )
}
