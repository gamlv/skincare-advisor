// ルーティン提案ページ

import { useState } from "react"
import { MoodSelector } from "../components/routine/MoodSelector"
import { WeatherBanner } from "../components/routine/WeatherBanner"
import { RoutineResult } from "../components/routine/RoutineResult"
import { LoadingSpinner } from "../components/ui/LoadingSpinner"
import { ErrorMessage } from "../components/ui/ErrorMessage"
import { EmptyState } from "../components/ui/EmptyState"
import { Button } from "../components/ui/Button"
import { useRoutine } from "../hooks/useRoutine"
import { useWeather } from "../hooks/useWeather"
import type { Mood } from "../types"

interface RoutinePageProps {
  hasProducts: boolean
  onGoToAdd: () => void
}

export function RoutinePage({ hasProducts, onGoToAdd }: RoutinePageProps) {
  const [selectedMoods, setSelectedMoods] = useState<Mood[]>([])
  const { result, loading, error, suggest, reset } = useRoutine()
  const { weather, loading: weatherLoading, togglePollen } = useWeather()

  const handleSuggest = () => {
    if (selectedMoods.length > 0) {
      suggest(selectedMoods, [], weather ?? undefined)
    }
  }

  const handleReset = () => {
    reset()
    setSelectedMoods([])
  }

  // 製品未登録の場合
  if (!hasProducts) {
    return (
      <div className="p-4 pb-24">
        <EmptyState
          icon="✨"
          message={"まず製品を登録してから\nルーティン提案を使ってください"}
          actionLabel="製品を追加する"
          onAction={onGoToAdd}
        />
      </div>
    )
  }

  return (
    <div className="p-4 pb-24">
      {/* 結果表示 */}
      {result && !loading && (
        <RoutineResult result={result} onReset={handleReset} />
      )}

      {/* ローディング */}
      {loading && (
        <LoadingSpinner message="ルーティンを提案中...（少々お待ちください）" />
      )}

      {/* エラー */}
      {error && !loading && (
        <div className="mb-4">
          <ErrorMessage message={error} onRetry={handleSuggest} />
        </div>
      )}

      {/* 気分選択UI（結果が出るまで表示） */}
      {!result && !loading && (
        <div className="flex flex-col gap-5">
          <WeatherBanner
            weather={weather}
            loading={weatherLoading}
            onTogglePollen={togglePollen}
          />

          <div>
            <p className="mb-1 text-sm font-medium text-gray-700">今日の気分は？</p>
            <p className="text-xs text-gray-400">気分・天気に合わせた最適なルーティンをAIが提案します</p>
          </div>

          <MoodSelector selected={selectedMoods} onChange={setSelectedMoods} />

          <Button
            onClick={handleSuggest}
            disabled={selectedMoods.length === 0}
            fullWidth
          >
            ルーティンを提案してもらう
          </Button>
        </div>
      )}
    </div>
  )
}
