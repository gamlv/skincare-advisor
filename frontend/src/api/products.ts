// 製品管理APIとの通信

import { del, get, post, put } from "./client"
import type { Product, ProductCreate, SearchCandidate, SearchResult } from "../types"

// 全製品を取得する
export const fetchProducts = () => get<Product[]>("/products")

// 製品を1件登録する
export const createProduct = (data: ProductCreate) =>
  post<Product>("/products", data)

// 製品情報を更新する
export const updateProduct = (id: string, data: ProductCreate) =>
  put<Product>(`/products/${id}`, data)

// 製品を削除する
export const deleteProduct = (id: string) => del(`/products/${id}`)

// あいまい検索で候補製品を複数取得する（軽量・高速）
export const searchCandidates = (query: string) =>
  post<SearchCandidate[]>("/products/search/candidates", { query })

// 特定の製品名で詳細検索する（成分情報を含む・時間がかかる）
export const searchProductDetail = (query: string) =>
  post<SearchResult>("/products/search", { query })
