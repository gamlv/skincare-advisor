// 製品一覧の取得・追加・削除を管理するカスタムフック

import { useCallback, useEffect, useState } from "react"
import {
  createProduct as apiCreate,
  deleteProduct as apiDelete,
  fetchProducts,
} from "../api/products"
import type { Product, ProductCreate } from "../types"

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchProducts()
      setProducts(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : "製品の取得に失敗しました")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const addProduct = useCallback(async (data: ProductCreate) => {
    const product = await apiCreate(data)
    setProducts((prev) => [...prev, product])
    return product
  }, [])

  const removeProduct = useCallback(async (id: string) => {
    await apiDelete(id)
    setProducts((prev) => prev.filter((p) => p.id !== id))
  }, [])

  return { products, loading, error, reload: load, addProduct, removeProduct }
}
