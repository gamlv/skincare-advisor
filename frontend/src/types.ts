// アプリ全体で使う型定義

export type ProductCategory =
  | "洗顔"
  | "化粧水"
  | "美容液"
  | "乳液"
  | "クリーム"
  | "日焼け止め"
  | "その他";

export type SkinConcern =
  | "乾燥"
  | "ニキビ"
  | "毛穴"
  | "シミ"
  | "敏感肌"
  | "くすみ"
  | "ハリ不足";

export type Mood = "refresh" | "relax" | "thorough" | "quick" | "sensitive";

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  "洗顔",
  "化粧水",
  "美容液",
  "乳液",
  "クリーム",
  "日焼け止め",
  "その他",
];

export const SKIN_CONCERNS: SkinConcern[] = [
  "乾燥",
  "ニキビ",
  "毛穴",
  "シミ",
  "敏感肌",
  "くすみ",
  "ハリ不足",
];

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: ProductCategory;
  ingredients: string[];
  concerns: SkinConcern[];
  created_at: string;
}

export interface ProductCreate {
  name: string;
  brand: string;
  category: ProductCategory;
  ingredients: string[];
  concerns: SkinConcern[];
}

export interface SearchCandidate {
  name: string;
  brand: string;
  category: ProductCategory;
  description: string;
}

export interface SearchResult {
  found: boolean;
  name: string;
  brand: string;
  category: ProductCategory;
  ingredients: string[];
  concerns: SkinConcern[];
}

export interface RoutineStep {
  order: number;
  product_name: string;
  instructions: string;
}

export interface RoutineWarning {
  product_a: string;
  product_b: string;
  ng_pairs: [string, string][];
}

export interface RoutineResponse {
  mood: Mood;
  mood_label: string;
  steps: RoutineStep[];
  notes: string;
  warnings: RoutineWarning[];
}
