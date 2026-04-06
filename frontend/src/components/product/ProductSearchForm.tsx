// 製品名でWeb検索するフォーム（Claude APIを使うため時間がかかる）

import { useState } from "react"
import { searchProduct } from "../../api/products"
import { Button } from "../ui/Button"
import { ErrorMessage } from "../ui/ErrorMessage"
import type { SearchResult } from "../../types"

interface ProductSearchFormProps {
  onResult: (result: SearchResult) => void
}

export function ProductSearchForm({ onResult }: ProductSearchFormProps) {
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)

  const handleSearch = async () => {
    if (!query.trim()) return
    setLoading(true)
    setError(null)
    setNotFound(false)
    try {
      const result = await searchProduct(query.trim())
      if (!result.found) {
        setNotFound(true)
      } else {
        onResult(result)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "検索に失敗しました")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          製品名で検索
        </label>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="例：シカクリーム Dr.Jart+"
          disabled={loading}
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm placeholder-gray-400 focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-100 disabled:bg-gray-50"
        />
      </div>

      {loading && (
        <div className="rounded-xl bg-pink-50 p-4 text-center">
          <div className="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-2 border-pink-200 border-t-pink-500" />
          <p className="text-sm text-pink-600">Webを検索中...</p>
          <p className="mt-1 text-xs text-pink-400">成分情報の取得に30〜60秒かかる場合があります</p>
        </div>
      )}

      {error && <ErrorMessage message={error} />}

      {notFound && !loading && (
        <div className="rounded-xl bg-yellow-50 p-4 text-center">
          <p className="text-sm text-yellow-700">製品が見つかりませんでした</p>
          <p className="mt-1 text-xs text-yellow-500">ブランド名も含めて検索してみてください</p>
        </div>
      )}

      <Button
        onClick={handleSearch}
        disabled={loading || !query.trim()}
        fullWidth
      >
        {loading ? "検索中..." : "検索する"}
      </Button>
    </div>
  )
}
