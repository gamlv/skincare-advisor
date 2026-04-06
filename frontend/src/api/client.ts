// APIリクエストの共通処理（エラーハンドリング・ベースURL管理）

const BASE_URL = ""

// APIエラーを表すインターフェース
export interface ApiErrorInfo {
  status: number
  message: string
}

// APIエラーを表すクラス
export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

// GETリクエスト
export async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`)
  return handleResponse<T>(res)
}

// POSTリクエスト
export async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  return handleResponse<T>(res)
}

// DELETEリクエスト（204 No Contentを想定）
export async function del(path: string): Promise<void> {
  const res = await fetch(`${BASE_URL}${path}`, { method: "DELETE" })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new ApiError(res.status, data.detail ?? "削除に失敗しました")
  }
}

// レスポンスのエラーハンドリング共通処理
async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new ApiError(res.status, data.detail ?? "エラーが発生しました")
  }
  return res.json() as Promise<T>
}
