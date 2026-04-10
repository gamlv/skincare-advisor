// Geolocation + Open-Meteo で天気情報を取得するカスタムフック

import { useState, useEffect } from "react"
import type { WeatherCondition } from "../types"

// Open-Meteo weather code → 日本語ラベル + 絵文字
function decodeWeatherCode(code: number): { label: string; icon: string } {
  if (code === 0)  return { label: "快晴",       icon: "☀️" }
  if (code <= 3)   return { label: "晴れ/曇り",  icon: "⛅" }
  if (code <= 48)  return { label: "霧",          icon: "🌫️" }
  if (code <= 67)  return { label: "雨",          icon: "🌧️" }
  if (code <= 77)  return { label: "雪",          icon: "❄️" }
  if (code <= 82)  return { label: "にわか雨",    icon: "🌦️" }
  if (code <= 86)  return { label: "にわか雪",    icon: "🌨️" }
  return           { label: "雷雨",              icon: "⛈️" }
}

async function fetchOpenMeteo(lat: number, lon: number): Promise<WeatherCondition> {
  const url = new URL("https://api.open-meteo.com/v1/forecast")
  url.searchParams.set("latitude", String(lat))
  url.searchParams.set("longitude", String(lon))
  url.searchParams.set("current", "temperature_2m,relative_humidity_2m,weather_code,uv_index")
  url.searchParams.set("forecast_days", "1")
  url.searchParams.set("timezone", "auto")

  const res = await fetch(url.toString())
  if (!res.ok) throw new Error("天気情報の取得に失敗しました")

  const data = await res.json()
  const cur = data.current
  const { label, icon } = decodeWeatherCode(cur.weather_code)

  return {
    temperature: Math.round(cur.temperature_2m),
    humidity:    Math.round(cur.relative_humidity_2m),
    uvIndex:     Math.round(cur.uv_index ?? 0),
    weatherCode: cur.weather_code,
    weatherLabel: label,
    weatherIcon:  icon,
    pollen: false,
  }
}

export function useWeather() {
  const [weather, setWeather]   = useState<WeatherCondition | null>(null)
  const [loading, setLoading]   = useState(true)
  const [error,   setError]     = useState<string | null>(null)

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("位置情報が利用できません")
      setLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const condition = await fetchOpenMeteo(
            pos.coords.latitude,
            pos.coords.longitude,
          )
          setWeather(condition)
        } catch (e) {
          setError(e instanceof Error ? e.message : "天気情報の取得に失敗しました")
        } finally {
          setLoading(false)
        }
      },
      () => {
        setError("位置情報の取得を許可してください")
        setLoading(false)
      },
    )
  }, [])

  // 花粉トグル
  const togglePollen = () =>
    setWeather((prev) => prev ? { ...prev, pollen: !prev.pollen } : prev)

  return { weather, loading, error, togglePollen }
}
