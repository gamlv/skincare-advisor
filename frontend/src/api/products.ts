// 製品管理APIとの通信

import { del, get, post } from "./client"
import type { Product, ProductCreate, SearchResult } from "../types"

// 全製品を取得する
export const fetchProducts = () => get<Product[]>("/products")

// 製品を1件登録する
export const createProduct = (data: ProductCreate) =>
  post<Product>("/products", data)

// 製品を削除する
export const deleteProduct = (id: string) => del(`/products/${id}`)

// 製品名でWeb検索して情報を取得する（ClaudeのWeb検索を使うため時間がかかる）
export const searchProduct = (query: string) =>
  post<SearchResult>("/products/search", { query })
