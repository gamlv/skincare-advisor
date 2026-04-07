// 製品管理APIとの通信

import { del, get, post, put } from "./client"
import type { Product, ProductCategory, ProductCreate, SearchCandidate, SearchResult } from "../types"

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

// Open Beauty Facts APIでJANコードから製品情報を取得する
export async function lookupByBarcode(barcode: string): Promise<SearchResult | null> {
  const res = await fetch(
    `https://world.openbeautyfacts.org/api/v0/product/${barcode}.json`
  )
  if (!res.ok) return null

  const data = await res.json()
  if (data.status !== 1 || !data.product) return null

  const p = data.product

  // 成分リストを取得する（ingredientsオブジェクト配列 → テキスト分割の順で試みる）
  let ingredients: string[] = []
  if (Array.isArray(p.ingredients) && p.ingredients.length > 0) {
    ingredients = p.ingredients
      .map((i: { text?: string }) => i.text ?? "")
      .filter(Boolean)
  } else if (typeof p.ingredients_text === "string" && p.ingredients_text) {
    ingredients = p.ingredients_text
      .split(/[,、，]/)
      .map((s: string) => s.trim())
      .filter(Boolean)
  }

  return {
    found: true,
    name: p.product_name ?? p.product_name_en ?? "",
    brand: p.brands ?? "",
    category: _inferCategory(p.categories_tags ?? []),
    ingredients,
    concerns: [],
  }
}

// Open Beauty Factsのカテゴリタグからアプリのカテゴリを推定する
function _inferCategory(tags: string[]): ProductCategory {
  const joined = tags.join(" ").toLowerCase()
  if (joined.includes("face-wash") || joined.includes("cleanser") || joined.includes("foam-cleanser")) return "洗顔"
  if (joined.includes("toner") || joined.includes("face-lotion")) return "化粧水"
  if (joined.includes("serum") || joined.includes("essence") || joined.includes("ampoule")) return "美容液"
  if (joined.includes("milky") || joined.includes("emulsion")) return "乳液"
  if (joined.includes("sunscreen") || joined.includes("sun-protection") || joined.includes("spf")) return "日焼け止め"
  if (joined.includes("cream") || joined.includes("moisturizer")) return "クリーム"
  return "その他"
}
