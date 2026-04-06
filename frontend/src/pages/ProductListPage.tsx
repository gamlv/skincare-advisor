// 製品一覧ページ

import { ProductCard } from "../components/product/ProductCard"
import { EmptyState } from "../components/ui/EmptyState"
import { ErrorMessage } from "../components/ui/ErrorMessage"
import { LoadingSpinner } from "../components/ui/LoadingSpinner"
import { useProducts } from "../hooks/useProducts"
import type { ProductCategory } from "../types"
import { PRODUCT_CATEGORIES } from "../types"
import { useState } from "react"

interface ProductListPageProps {
  onGoToAdd: () => void
}

export function ProductListPage({ onGoToAdd }: ProductListPageProps) {
  const { products, loading, error, reload, editProduct, removeProduct } = useProducts()
  const [activeCategory, setActiveCategory] = useState<ProductCategory | "すべて">("すべて")

  const filtered =
    activeCategory === "すべて"
      ? products
      : products.filter((p) => p.category === activeCategory)

  const categories: ("すべて" | ProductCategory)[] = ["すべて", ...PRODUCT_CATEGORIES]

  return (
    <div>
      {/* カテゴリフィルタタブ */}
      <div className="sticky top-[49px] z-10 bg-white/90 backdrop-blur-sm border-b border-gray-100 px-4 py-2">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={[
                "whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-colors",
                activeCategory === cat
                  ? "bg-pink-500 text-white"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200",
              ].join(" ")}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* コンテンツ */}
      <div className="p-4 pb-24">
        {loading && <LoadingSpinner message="製品を読み込み中..." />}

        {error && !loading && (
          <ErrorMessage message={error} onRetry={reload} />
        )}

        {!loading && !error && filtered.length === 0 && (
          <EmptyState
            icon="🧴"
            message={
              activeCategory === "すべて"
                ? "まだ製品が登録されていません"
                : `${activeCategory}の製品はありません`
            }
            actionLabel={activeCategory === "すべて" ? "製品を追加する" : undefined}
            onAction={activeCategory === "すべて" ? onGoToAdd : undefined}
          />
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="flex flex-col gap-3">
            {filtered.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onDelete={removeProduct}
                onEdit={editProduct}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
