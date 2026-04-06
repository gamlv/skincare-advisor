// 製品カードコンポーネント（タップで詳細モーダルを開く）

import { useState } from "react"
import { Badge, categoryColor } from "../ui/Badge"
import { ProductDetail } from "./ProductDetail"
import type { Product } from "../../types"

interface ProductCardProps {
  product: Product
  onDelete: (id: string) => void
}

export function ProductCard({ product, onDelete }: ProductCardProps) {
  const [showDetail, setShowDetail] = useState(false)

  return (
    <>
      <button
        onClick={() => setShowDetail(true)}
        className="w-full rounded-2xl bg-white p-4 text-left shadow-sm border border-gray-100 hover:shadow-md hover:border-pink-100 transition-all active:scale-[0.99]"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-gray-900">{product.name}</p>
            <p className="text-sm text-gray-400">{product.brand}</p>
          </div>
          <Badge
            label={product.category}
            color={categoryColor(product.category)}
          />
        </div>

        {/* 肌悩みタグ（あれば最大3つ表示） */}
        {product.concerns.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1">
            {product.concerns.slice(0, 3).map((c) => (
              <Badge key={c} label={c} color="gray" />
            ))}
            {product.concerns.length > 3 && (
              <span className="text-xs text-gray-400">
                +{product.concerns.length - 3}
              </span>
            )}
          </div>
        )}
      </button>

      {showDetail && (
        <ProductDetail
          product={product}
          onClose={() => setShowDetail(false)}
          onDelete={onDelete}
        />
      )}
    </>
  )
}
