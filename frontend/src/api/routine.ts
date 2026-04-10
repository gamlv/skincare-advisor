// ルーティン提案APIとの通信

import { post } from "./client"
import type { Mood, RoutineResponse, WeatherCondition } from "../types"

// 気分・天気と対象製品IDでルーティンを提案する
export const suggestRoutine = (
  mood: Mood,
  product_ids: string[] = [],
  weather?: WeatherCondition,
) =>
  post<RoutineResponse>("/routine/suggest", {
    mood,
    product_ids,
    // バックエンドのフィールド名（snake_case）に変換して送る
    weather: weather
      ? {
          temperature: weather.temperature,
          humidity: weather.humidity,
          uv_index: weather.uvIndex,
          weather_label: weather.weatherLabel,
          pollen: weather.pollen,
        }
      : undefined,
  })
