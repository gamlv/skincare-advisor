// 検索結果を確認・編集して登録するフォーム

import { useState } from "react"
import { Button } from "../ui/Button"
import { PRODUCT_CATEGORIES, SKIN_CONCERNS } from "../../types"
import type { ProductCategory, SearchResult, SkinConcern } from "../../types"

interface ProductConfirmFormProps {
  initialData: SearchResult
  onSubmit: (data: SearchResult) => void
  onBack: () => void
}

export function ProductConfirmForm({
  initialData,
  onSubmit,
  onBack,
}: ProductConfirmFormProps) {
  const [form, setForm] = useState<SearchResult>(initialData)
  const [ingredientInput, setIngredientInput] = useState("")

  const update = (field: keyof SearchResult, value: unknown) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const addIngredient = () => {
    const val = ingredientInput.trim()
    if (val && !form.ingredients.includes(val)) {
      update("ingredients", [...form.ingredients, val])
    }
    setIngredientInput("")
  }

  const removeIngredient = (ingredient: string) =>
    update("ingredients", form.ingredients.filter((i) => i !== ingredient))

  const toggleConcern = (concern: SkinConcern) => {
    const concerns = form.concerns.includes(concern)
      ? form.concerns.filter((c) => c !== concern)
      : [...form.concerns, concern]
    update("concerns", concerns)
  }

  // 取得できなかった項目を検出する
  const missingFields = [
    !form.name && "商品名",
    !form.brand && "ブランド",
    form.ingredients.length === 0 && "成分",
    form.concerns.length === 0 && "肌悩み",
  ].filter(Boolean)

  return (
    <div className="flex flex-col gap-5">
      {/* 取得状況バナー */}
      {missingFields.length === 0 ? (
        <div className="rounded-xl bg-green-50 p-3 text-center">
          <p className="text-sm text-green-700">製品情報を取得しました。内容を確認して登録してください。</p>
        </div>
      ) : (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3">
          <p className="text-sm font-medium text-amber-800">一部の情報を取得できませんでした</p>
          <p className="mt-0.5 text-xs text-amber-600">
            取得できなかった項目：{missingFields.join("・")}
          </p>
          <p className="mt-1 text-xs text-amber-500">空欄を手入力して登録してください</p>
        </div>
      )}

      {/* 商品名 */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-gray-500">
          商品名 {!form.name && <span className="text-amber-500">（未取得）</span>}
        </label>
        <input
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
          placeholder="商品名を入力してください"
          className={[
            "w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-100",
            !form.name ? "border-amber-300 bg-amber-50 focus:border-pink-400" : "border-gray-200 focus:border-pink-400",
          ].join(" ")}
        />
      </div>

      {/* ブランド */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-gray-500">
          ブランド {!form.brand && <span className="text-amber-500">（未取得）</span>}
        </label>
        <input
          value={form.brand}
          onChange={(e) => update("brand", e.target.value)}
          placeholder="ブランド名を入力してください"
          className={[
            "w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-100",
            !form.brand ? "border-amber-300 bg-amber-50 focus:border-pink-400" : "border-gray-200 focus:border-pink-400",
          ].join(" ")}
        />
      </div>

      {/* カテゴリ */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-gray-500">カテゴリ</label>
        <select
          value={form.category}
          onChange={(e) => update("category", e.target.value as ProductCategory)}
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-100"
        >
          {PRODUCT_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* 肌悩み */}
      <div>
        <label className="mb-2 block text-xs font-medium text-gray-500">
          肌悩み {form.concerns.length === 0 && <span className="text-amber-500">（未取得・選択してください）</span>}
        </label>
        <div className="flex flex-wrap gap-2">
          {SKIN_CONCERNS.map((concern) => (
            <button
              key={concern}
              type="button"
              onClick={() => toggleConcern(concern)}
              className={[
                "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                form.concerns.includes(concern)
                  ? "bg-purple-500 text-white"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200",
              ].join(" ")}
            >
              {concern}
            </button>
          ))}
        </div>
      </div>

      {/* 成分 */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-gray-500">
          成分 {form.ingredients.length === 0 && <span className="text-amber-500">（未取得・任意で追加）</span>}
        </label>
        <div className="flex gap-2 mb-2">
          <input
            value={ingredientInput}
            onChange={(e) => setIngredientInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addIngredient()}
            placeholder="成分を追加（Enterで確定）"
            className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-100"
          />
          <button
            type="button"
            onClick={addIngredient}
            className="rounded-xl bg-gray-100 px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-200"
          >
            追加
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
          {form.ingredients.map((ing) => (
            <span
              key={ing}
              className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs text-blue-700"
            >
              {ing}
              <button
                type="button"
                onClick={() => removeIngredient(ing)}
                className="ml-0.5 text-blue-400 hover:text-blue-600"
              >
                ×
              </button>
            </span>
          ))}
          {form.ingredients.length === 0 && (
            <p className="text-xs text-gray-400">成分なし</p>
          )}
        </div>
      </div>

      {/* ボタン */}
      <div className="flex gap-3 pt-2">
        <Button variant="secondary" onClick={onBack} fullWidth>
          やり直す
        </Button>
        <Button
          onClick={() => onSubmit(form)}
          disabled={!form.name.trim() || !form.brand.trim()}
          fullWidth
        >
          登録する
        </Button>
      </div>
    </div>
  )
}
