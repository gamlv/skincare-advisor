// ルーティン提案APIとの通信

import { post } from "./client"
import type { Mood, RoutineResponse } from "../types"

// 気分と対象製品IDでルーティンを提案する
export const suggestRoutine = (mood: Mood, product_ids: string[] = []) =>
  post<RoutineResponse>("/routine/suggest", { mood, product_ids })
