// ルーティンの1ステップを表示するコンポーネント

import type { RoutineStep as Step } from "../../types"

interface RoutineStepProps {
  step: Step
}

export function RoutineStep({ step }: RoutineStepProps) {
  return (
    <div className="flex gap-4">
      {/* ステップ番号 */}
      <div className="flex-shrink-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-pink-500 text-sm font-semibold text-white">
          {step.order}
        </div>
      </div>

      {/* 内容 */}
      <div className="flex-1 pb-4 border-b border-gray-100">
        <p className="font-medium text-gray-900">{step.product_name}</p>
        <p className="mt-1 text-sm text-gray-500 leading-relaxed">
          {step.instructions}
        </p>
      </div>
    </div>
  )
}
