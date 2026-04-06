// 製品詳細モーダルコンポーネント

import { useState } from "react"
import { Badge, categoryColor } from "../ui/Badge"
import { ProductManualForm } from "./ProductManualForm"
import type { Product, ProductCreate } from "../../types"

interface ProductDetailProps {
  product: Product
  onClose: () => void
  onDelete: (id: string) => void
  onEdit: (id: string, data: ProductCreate) => Promise<unknown>
}

export function ProductDetail({
  product,
  onClose,
  onDelete,
  onEdit,
}: ProductDetailProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleDelete = () => {
    if (confirm(`「${product.name}」を削除しますか？`)) {
      onDelete(product.id)
      onClose()
    }
  }

  const handleEdit = async (data: ProductCreate) => {
    setSaving(true)
    try {
      await onEdit(product.id, data)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    // オーバーレイ
    <div
      className="fixed inset-0 z-20 flex items-end sm:items-center justify-center bg-black/40"
      onClick={onClose}
    >
      {/* モーダル本体 */}
      <div
        className="w-full max-w-lg rounded-t-2xl sm:rounded-2xl bg-white p-6 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {isEditing ? "製品を編集" : product.name}
            </h2>
            {!isEditing && <p className="text-sm text-gray-500">{product.brand}</p>}
          </div>
          <button
            onClick={onClose}
            className="ml-2 text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ×
          </button>
        </div>

        {isEditing ? (
          <ProductManualForm
            initialValues={{
              name: product.name,
              brand: product.brand,
              category: product.category,
              ingredients: product.ingredients,
              concerns: product.concerns,
            }}
            onSubmit={handleEdit}
            onCancel={() => setIsEditing(false)}
            submitLabel={saving ? "保存中..." : "保存する"}
          />
        ) : (
          <>
            {/* カテゴリバッジ */}
            <div className="mb-4">
              <Badge label={product.category} color={categoryColor(product.category)} />
            </div>

            {/* 肌悩み */}
            {product.concerns.length > 0 && (
              <div className="mb-4">
                <p className="mb-1.5 text-xs font-medium text-gray-400">肌悩み</p>
                <div className="flex flex-wrap gap-1.5">
                  {product.concerns.map((c) => (
                    <Badge key={c} label={c} color="purple" />
                  ))}
                </div>
              </div>
            )}

            {/* 成分リスト */}
            <div className="mb-6">
              <p className="mb-1.5 text-xs font-medium text-gray-400">成分</p>
              {product.ingredients.length > 0 ? (
                <p className="text-sm text-gray-700 leading-relaxed">
                  {product.ingredients.join("、")}
                </p>
              ) : (
                <p className="text-sm text-gray-400">成分情報なし</p>
              )}
            </div>

            {/* 登録日 */}
            <p className="mb-4 text-xs text-gray-400">
              登録日：{new Date(product.created_at).toLocaleDateString("ja-JP")}
            </p>

            {/* 編集・削除ボタン */}
            <div className="flex gap-2">
              <button
                onClick={() => setIsEditing(true)}
                className="flex-1 rounded-xl border border-pink-200 py-3 text-sm font-medium text-pink-500 hover:bg-pink-50 transition-colors"
              >
                編集する
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 rounded-xl border border-red-200 py-3 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
              >
                削除する
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
