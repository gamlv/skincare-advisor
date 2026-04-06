// 検索候補リスト（あいまい検索の結果から製品を選択する）

import { Badge, categoryColor } from "../ui/Badge"
import type { SearchCandidate } from "../../types"

interface ProductCandidateListProps {
  candidates: SearchCandidate[]
  loading: boolean
  onSelect: (candidate: SearchCandidate) => void
  onBack: () => void
}

export function ProductCandidateList({
  candidates,
  loading,
  onSelect,
  onBack,
}: ProductCandidateListProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600"
        >
          ← 検索に戻る
        </button>
        <p className="text-xs text-gray-400">{candidates.length}件の候補</p>
      </div>

      {loading && (
        <div className="rounded-xl bg-pink-50 p-4 text-center">
          <div className="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-2 border-pink-200 border-t-pink-500" />
          <p className="text-sm text-pink-600">詳細情報を取得中...</p>
        </div>
      )}

      {!loading && (
        <div className="flex flex-col gap-2">
          {candidates.map((candidate, i) => (
            <button
              key={`${candidate.name}-${i}`}
              onClick={() => onSelect(candidate)}
              className="w-full rounded-2xl bg-white p-4 text-left shadow-sm border border-gray-100 hover:shadow-md hover:border-pink-200 transition-all active:scale-[0.99]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900">{candidate.name}</p>
                  <p className="text-sm text-gray-400">{candidate.brand}</p>
                </div>
                <Badge
                  label={candidate.category}
                  color={categoryColor(candidate.category)}
                />
              </div>
              {candidate.description && (
                <p className="mt-2 text-xs text-gray-500 leading-relaxed">
                  {candidate.description}
                </p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
