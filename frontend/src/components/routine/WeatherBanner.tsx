// 天気・環境情報バナー（花粉トグル付き）

import type { WeatherCondition } from "../../types"

interface WeatherBannerProps {
  weather: WeatherCondition | null
  loading: boolean
  onTogglePollen: () => void
}

function uvLabel(uv: number): string {
  if (uv <= 2)  return "低"
  if (uv <= 5)  return "中"
  if (uv <= 7)  return "高"
  if (uv <= 10) return "非常に高"
  return "極端"
}

function uvColorClass(uv: number): string {
  if (uv <= 2)  return "text-green-600"
  if (uv <= 5)  return "text-yellow-600"
  if (uv <= 7)  return "text-orange-500"
  return "text-red-600"
}

export function WeatherBanner({ weather, loading, onTogglePollen }: WeatherBannerProps) {
  if (loading) {
    return (
      <div className="rounded-2xl bg-sky-50 border border-sky-100 px-4 py-3 text-xs text-sky-400 text-center">
        天気情報を取得中...
      </div>
    )
  }

  // 取得失敗時はバナー非表示（ルーティン提案は天気なしで続行できる）
  if (!weather) return null

  return (
    <div className="rounded-2xl bg-sky-50 border border-sky-100 px-4 py-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">

        {/* 天気・気温・湿度・UV */}
        <div className="flex items-center gap-2 flex-wrap text-xs text-gray-600">
          <span className="text-lg leading-none">{weather.weatherIcon}</span>
          <span className="font-semibold text-gray-700">{weather.weatherLabel}</span>
          <span>🌡 {weather.temperature}℃</span>
          <span className={weather.humidity < 40 ? "text-amber-600 font-semibold" : ""}>
            💧 {weather.humidity}%
            {weather.humidity < 40 && <span className="ml-0.5">乾燥注意</span>}
          </span>
          <span className={uvColorClass(weather.uvIndex)}>
            ☀ UV {weather.uvIndex}（{uvLabel(weather.uvIndex)}）
          </span>
        </div>

        {/* 花粉トグル */}
        <button
          onClick={onTogglePollen}
          className={[
            "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all border",
            weather.pollen
              ? "bg-green-100 border-green-300 text-green-700"
              : "bg-white border-gray-200 text-gray-400 hover:border-green-200",
          ].join(" ")}
        >
          🌿 花粉注意
          <span
            className={[
              "inline-block w-3.5 h-3.5 rounded-full border-2 transition-colors",
              weather.pollen
                ? "bg-green-500 border-green-500"
                : "bg-white border-gray-300",
            ].join(" ")}
          />
        </button>

      </div>
    </div>
  )
}
