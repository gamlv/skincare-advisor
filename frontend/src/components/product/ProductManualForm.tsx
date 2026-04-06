// 製品情報を手入力で登録するフォーム

import { useState } from "react"
import { Button } from "../ui/Button"
import { PRODUCT_CATEGORIES, SKIN_CONCERNS } from "../../types"
import type { ProductCategory, ProductCreate, SkinConcern } from "../../types"

interface ProductManualFormProps {
  onSubmit: (data: ProductCreate) => void
}

const INITIAL_FORM: ProductCreate = {
  name: "",
  brand: "",
  category: "その他",
  ingredients: [],
  concerns: [],
}

export function ProductManualForm({ onSubmit }: ProductManualFormProps) {
  const [form, setForm] = useState<ProductCreate>(INITIAL_FORM)
  const [ingredientInput, setIngredientInput] = useState("")

  const update = (field: keyof ProductCreate, value: unknown) =>
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

  return (
    <div className="flex flex-col gap-5">
      {/* 商品名 */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-gray-500">
          商品名 <span className="text-red-400">*</span>
        </label>
        <input
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
          placeholder="例：モイスチャーサージ 72H"
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-100"
        />
      </div>

      {/* ブランド */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-gray-500">
          ブランド <span className="text-red-400">*</span>
        </label>
        <input
          value={form.brand}
          onChange={(e) => update("brand", e.target.value)}
          placeholder="例：CLINIQUE"
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-100"
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
        <label className="mb-2 block text-xs font-medium text-gray-500">肌悩み</label>
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
        <label className="mb-1.5 block text-xs font-medium text-gray-500">成分（任意）</label>
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
        <div className="flex flex-wrap gap-1.5 min-h-6">
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
        </div>
      </div>

      <Button
        onClick={() => onSubmit(form)}
        disabled={!form.name.trim() || !form.brand.trim()}
        fullWidth
        className="mt-2"
      >
        登録する
      </Button>
    </div>
  )
}
