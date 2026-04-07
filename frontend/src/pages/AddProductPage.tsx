// 製品追加ページ（検索 → 候補選択 → 詳細取得 → 確認・編集 → 登録）

import { Component, useState } from "react"
import type { ReactNode } from "react"
import { ProductSearchForm } from "../components/product/ProductSearchForm"
import { ProductCandidateList } from "../components/product/ProductCandidateList"
import { ProductConfirmForm } from "../components/product/ProductConfirmForm"
import { ProductManualForm } from "../components/product/ProductManualForm"
import { BarcodeScanner } from "../components/product/BarcodeScanner"
import { ErrorMessage } from "../components/ui/ErrorMessage"
import { searchProductDetail, lookupByBarcode } from "../api/products"
import type { ProductCreate, SearchCandidate, SearchResult } from "../types"

// バーコードスキャナーのクラッシュを白画面ではなくエラーメッセージで表示するバウンダリ
class BarcodeBoundary extends Component<
  { onReset: () => void; children: ReactNode },
  { error: string | null; detail: string | null }
> {
  constructor(props: { onReset: () => void; children: ReactNode }) {
    super(props)
    this.state = { error: null, detail: null }
  }
  // html5-qrcodeは文字列をthrowすることがあるためunknownで受ける
  static getDerivedStateFromError(e: unknown) {
    if (e instanceof Error) {
      return { error: e.message || e.name || "Error", detail: e.stack ?? null }
    }
    if (typeof e === "string") {
      return { error: e || "不明なエラー", detail: null }
    }
    try {
      return { error: JSON.stringify(e), detail: null }
    } catch {
      return { error: "不明なエラー", detail: null }
    }
  }
  componentDidCatch(e: unknown, info: { componentStack: string }) {
    console.error("BarcodeScanner クラッシュ:", e)
    console.error("コンポーネントスタック:", info.componentStack)
  }
  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-left">
            <p className="text-sm font-medium text-red-700">カメラの起動に失敗しました</p>
            <p className="mt-1 text-xs text-red-500 break-all">{this.state.error}</p>
            {this.state.detail && (
              <pre className="mt-2 text-xs text-red-400 break-all whitespace-pre-wrap">
                {this.state.detail.slice(0, 300)}
              </pre>
            )}
          </div>
          <button
            onClick={this.props.onReset}
            className="text-sm text-gray-400 underline hover:text-gray-600 text-center"
          >
            戻る
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

type Step = "search" | "barcode" | "candidates" | "confirm" | "manual" | "done"

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

  // バーコードスキャン成功 → Open Beauty Facts → 必要ならClaude APIにフォールバック
  const handleBarcodeScan = async (barcode: string) => {
    setDetailLoading(true)
    setError(null)
    try {
      const obfResult = await lookupByBarcode(barcode)

      if (obfResult && obfResult.name && obfResult.ingredients.length > 0) {
        // Open Beauty Factsで完全な情報が取れた
        setSearchResult(obfResult)
        setStep("confirm")
      } else if (obfResult && obfResult.name) {
        // 製品名は取れたが成分が不十分 → Claude APIで成分情報を補完する
        const claudeQuery = [obfResult.brand, obfResult.name].filter(Boolean).join(" ")
        const claudeResult = await searchProductDetail(claudeQuery)
        setSearchResult({
          found: true,
          name: obfResult.name,
          brand: obfResult.brand || claudeResult.brand,
          category: obfResult.category,
          ingredients: claudeResult.found ? claudeResult.ingredients : [],
          concerns: claudeResult.found ? claudeResult.concerns : [],
        })
        setStep("confirm")
      } else {
        // Open Beauty Factsに未登録 → エラーを表示して検索フォームへ
        setError(
          `バーコード「${barcode}」の製品情報がデータベースに見つかりませんでした。製品名で検索してください。`
        )
        setStep("search")
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "製品情報の取得に失敗しました")
      setStep("search")
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
          {/* バーコードで登録ボタン */}
          <button
            onClick={() => { setError(null); setStep("barcode") }}
            className="flex items-center justify-center gap-2 w-full rounded-xl border-2 border-dashed border-pink-300 bg-pink-50 py-4 text-sm font-medium text-pink-600 hover:bg-pink-100 transition-colors"
          >
            <span className="text-xl">📷</span>
            バーコードで登録
          </button>

          {error && <ErrorMessage message={error} />}

          <div className="relative flex items-center gap-3">
            <div className="flex-1 border-t border-gray-200" />
            <span className="text-xs text-gray-400">または</span>
            <div className="flex-1 border-t border-gray-200" />
          </div>

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

      {/* バーコードスキャン */}
      {step === "barcode" && (
        <div className="flex flex-col gap-4">
          {detailLoading ? (
            <div className="rounded-xl bg-pink-50 p-8 text-center">
              <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-pink-200 border-t-pink-500" />
              <p className="text-sm text-pink-600">製品情報を取得中...</p>
            </div>
          ) : (
            <BarcodeBoundary onReset={() => setStep("search")}>
              <BarcodeScanner
                onScan={handleBarcodeScan}
                onCancel={() => setStep("search")}
              />
            </BarcodeBoundary>
          )}
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
