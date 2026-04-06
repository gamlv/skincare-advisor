// アプリのルートコンポーネント（ページ切り替えとレイアウト）

import { useState } from "react"
import { Header } from "./components/layout/Header"
import { BottomNav } from "./components/layout/BottomNav"
import { ProductListPage } from "./pages/ProductListPage"
import { AddProductPage } from "./pages/AddProductPage"
import { RoutinePage } from "./pages/RoutinePage"
import { useProducts } from "./hooks/useProducts"

type Page = "products" | "add" | "routine"

const PAGE_TITLES: Record<Page, string> = {
  products: "🧴 スキンケアアドバイザー",
  add: "製品を追加",
  routine: "今日のルーティン",
}

function App() {
  const [currentPage, setCurrentPage] = useState<Page>("products")
  const { products, loading, addProduct } = useProducts()

  const goToAdd = () => setCurrentPage("add")

  return (
    <div className="min-h-svh bg-gray-50">
      <Header title={PAGE_TITLES[currentPage]} />

      <main>
        {currentPage === "products" && (
          <ProductListPage onGoToAdd={goToAdd} />
        )}
        {currentPage === "add" && (
          <AddProductPage
            onAdded={async (data) => {
              await addProduct(data)
            }}
          />
        )}
        {currentPage === "routine" && (
          <RoutinePage
            hasProducts={!loading && products.length > 0}
            onGoToAdd={goToAdd}
          />
        )}
      </main>

      <BottomNav current={currentPage} onChange={setCurrentPage} />
    </div>
  )
}

export default App
