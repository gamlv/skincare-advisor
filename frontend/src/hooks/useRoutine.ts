// ルーティン提案の状態管理カスタムフック

import { useState } from "react"
import { suggestRoutine } from "../api/routine"
import type { Mood, RoutineResponse, WeatherCondition } from "../types"

export function useRoutine() {
  const [result, setResult] = useState<RoutineResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const suggest = async (moods: Mood[], productIds: string[] = [], weather?: WeatherCondition) => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const data = await suggestRoutine(moods, productIds, weather ?? undefined)
      setResult(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : "ルーティン提案に失敗しました")
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setResult(null)
    setError(null)
  }

  return { result, loading, error, suggest, reset }
}
