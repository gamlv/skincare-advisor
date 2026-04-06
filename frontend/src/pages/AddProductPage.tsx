// 製品追加ページ（検索 → 候補選択 → 詳細取得 → 確認・編集 → 登録）

import { useState } from "react"
import { ProductSearchForm } from "../components/product/ProductSearchForm"
import { ProductCandidateList } from "../components/product/ProductCandidateList"
import { ProductConfirmForm } from "../components/product/ProductConfirmForm"
import { ProductManualForm } from "../components/product/ProductManualForm"
import { ErrorMessage } from "../components/ui/ErrorMessage"
import { searchProductDetail } from "../api/products"
import type { ProductCreate, SearchCandidate, SearchResult } from "../types"

type Step = "search" | "candidates" | "confirm" | "manual" | "done"

interface AddProductPageProps {
  onAdded: (data: ProductCreate) => Promise<void>
}

export function AddProductPage({ onAdded }: AddProductPageProps) {
  const [step, setStep] = useState<Step>("search")
  const [candidates, setCandidates] = useState<SearchCandidate[]>([])
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastAdded, setLastAdded] = useState<string | null>(null)

  // 候補リストを受け取る
  const handleCandidates = (results: SearchCandidate[]) => {
    setCandidates(results)
    setStep("candidates")
  }

  // 候補を選択 → 詳細検索
  const handleSelectCandidate = async (candidate: SearchCandidate) => {
    setDetailLoading(true)
    setError(null)
    try {
      const detailQuery = `${candidate.brand} ${candidate.name}`
      const result = await searchProductDetail(detailQuery)
      if (result.found) {
        setSearchResult(result)
        setStep("confirm")
      } else {
        // 詳細が取れなかった場合は候補の情報でフォームを開く
        setSearchResult({
          found: true,
          name: candidate.name,
          brand: candidate.brand,
          category: candidate.category,
          ingredients: [],
          concerns: [],
        })
        setStep("confirm")
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "詳細情報の取得に失敗しました")
    } finally {
      setDetailLoading(false)
    }
  }

  const handleConfirmSubmit = async (data: SearchResult) => {
    setError(null)
    try {
      await onAdded(data as ProductCreate)
      setLastAdded(data.name)
      setStep("done")
    } catch (e) {
      setError(e instanceof Error ? e.message : "登録に失敗しました")
    }
  }

  const handleManualSubmit = async (data: ProductCreate) => {
    setError(null)
    try {
      await onAdded(data)
      setLastAdded(data.name)
      setStep("done")
    } catch (e) {
      setError(e instanceof Error ? e.message : "登録に失敗しました")
    }
  }

  const reset = () => {
    setStep("search")
    setCandidates([])
    setSearchResult(null)
    setError(null)
    setLastAdded(null)
  }

  return (
    <div className="p-4 pb-24">
      {/* 登録完了 */}
      {step === "done" && (
        <div className="flex flex-col items-center gap-5 py-12">
          <span className="text-6xl">✅</span>
          <div className="text-center">
            <p className="font-semibold text-gray-900">登録完了！</p>
            <p className="mt-1 text-sm text-gray-500">「{lastAdded}」を追加しました</p>
          </div>
          <button
            onClick={reset}
            className="rounded-xl bg-pink-500 px-6 py-3 text-sm font-medium text-white hover:bg-pink-600 transition-colors"
          >
            続けて登録する
          </button>
        </div>
      )}

      {/* 検索フォーム */}
      {step === "search" && (
        <div className="flex flex-col gap-4">
          <ProductSearchForm onCandidates={handleCandidates} />
          <div className="text-center">
            <button
              onClick={() => setStep("manual")}
              className="text-sm text-gray-400 underline hover:text-gray-600"
            >
              検索せずに手入力で登録する
            </button>
          </div>
        </div>
      )}

      {/* 候補リスト */}
      {step === "candidates" && (
        <div>
          {error && <div className="mb-4"><ErrorMessage message={error} /></div>}
          <ProductCandidateList
            candidates={candidates}
            loading={detailLoading}
            onSelect={handleSelectCandidate}
            onBack={() => setStep("search")}
          />
        </div>
      )}

      {/* 確認・編集フォーム */}
      {step === "confirm" && searchResult && (
        <div>
          {error && <div className="mb-4"><ErrorMessage message={error} /></div>}
          <ProductConfirmForm
            initialData={searchResult}
            onSubmit={handleConfirmSubmit}
            onBack={() => setStep("candidates")}
          />
        </div>
      )}

      {/* 手入力フォーム */}
      {step === "manual" && (
        <div>
          <button
            onClick={reset}
            className="mb-4 flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600"
          >
            ← 戻る
          </button>
          {error && <div className="mb-4"><ErrorMessage message={error} /></div>}
          <ProductManualForm onSubmit={handleManualSubmit} />
        </div>
      )}
    </div>
  )
}
