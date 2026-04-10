# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

妻が実際に使うスキンケア用品管理・提案サービス。
所有しているスキンケア用品を登録し、その日の気分に合わせて成分的にNGな組み合わせを除外した最適なルーティンを提案する。

## セットアップ・開発コマンド

```bash
# 仮想環境の有効化
source .venv/bin/activate

# 依存関係のインストール
uv sync

# フロントエンド依存関係
cd frontend && npm install && cd ..

# 開発サーバー起動（ターミナル2つ必要）
uvicorn main:app --reload --host 0.0.0.0   # バックエンド
cd frontend && npm run dev -- --host        # フロントエンド → https://localhost:5173
```

> バーコードスキャン機能はカメラAPIの制約でHTTPSが必要。
> `@vitejs/plugin-basic-ssl` により開発サーバーは自動でHTTPS（自己署名証明書）になる。
> スマホからは `https://<WindowsホストIP>:5173` でアクセスする。

## 技術スタック

- Python 3.12 / uv（環境管理）
- **FastAPI** + **Uvicorn**（バックエンドAPI）
- **Anthropic Claude API**（製品検索・ルーティン提案）
- **python-dotenv**（`.env` からAPIキーを読み込み）
- **React + Vite + TypeScript + Tailwind CSS**（フロントエンド）
- **html5-qrcode**（バーコードスキャン）
- **Open Beauty Facts API**（JANコードから製品情報取得）
- **Open-Meteo API**（天気情報取得・無料・APIキー不要）
- **@vitejs/plugin-basic-ssl**（開発時HTTPS対応）

## ディレクトリ構成と各ファイルの役割

```
main.py                      # FastAPIアプリ初期化・ルーター登録・CORS設定・静的ファイル配信
models.py                    # PydanticモデルとDB定数（ProductCreate, Product）
.env                         # APIキー（Gitに含めない）
.env.example                 # 環境変数テンプレート

routers/
  products.py                # 製品CRUD + 検索エンドポイント
  routine.py                 # ルーティン提案エンドポイント

services/
  product_store.py           # data/products.jsonへの読み書き
  ingredient_checker.py      # 成分正規化・NGペア検出 ✅
  product_search.py          # Claude API web_search連携 ✅
  routine_suggester.py       # Claude API ルーティン提案 ✅

data/
  products.json              # 製品データ（JSONファイルで永続化）

static/                      # npm run build の出力先（.gitignore対象）

frontend/                    # Reactフロントエンド
  src/
    types.ts                 # 全型定義
    api/                     # APIクライアント（client.ts, products.ts, routine.ts）
    hooks/                   # useProducts.ts, useRoutine.ts, useWeather.ts
    components/
      layout/                # Header, BottomNav
      ui/                    # Button, Badge, LoadingSpinner, ErrorMessage, EmptyState
      product/               # ProductCard, ProductDetail, ProductSearchForm,
                             # ProductConfirmForm, ProductManualForm, BarcodeScanner
      routine/               # MoodSelector, WeatherBanner, RoutineStep, RoutineWarning, RoutineResult
    pages/                   # ProductListPage, AddProductPage, RoutinePage
```

## データモデル

`models.py` に定義。`ProductCreate`（登録リクエスト）と `Product`（保存形式）の2クラス構成。
`Product.new(data, product_id)` ファクトリメソッドでUUID採番と日時付与を行う。

```python
class Product(BaseModel):
    id: str           # UUID（サーバー採番）
    name: str
    brand: str
    category: str     # PRODUCT_CATEGORIES の選択肢から選ぶ
    ingredients: list[str]
    concerns: list[str]
    created_at: str   # ISO8601（UTC）
```

## 実装機能

- **製品登録・一覧・詳細・削除**：`routers/products.py`（実装済み）
- **製品検索**：製品名でWeb検索して情報を自動取得（Claude API + web_search） ✅
- **製品追加フロー**：バーコードスキャン or 検索フォーム → 確認・編集画面（未取得項目はアンバー色で強調）→ 登録
- **バーコードスキャン**：スマホカメラでJANコードを読み取り → Open Beauty Facts APIで製品情報取得 → 取得不足時はClaude APIで補完 ✅
- **気分選択**：朝ケア・夜ケア・リフレッシュ・リラックス・しっかりケア・時短・肌荒れ・美白ケア・エイジングケア・毛穴ケアの10種類 ✅
- **天気・環境連携**：Geolocation + Open-Meteo で気温・湿度・UV・天気を自動取得 → Claude プロンプトに組み込む。花粉は手動トグル ✅
- **ルーティン提案**：気分・天気に合わせてClaude APIが最適な組み合わせを提案 ✅
- **成分相性チェック**：NGな組み合わせを自動検出して除外 ✅

## 成分NGペアのルール（必ず守ること）

`services/ingredient_checker.py` に定数として定義する。

| 成分A | 成分B |
|---|---|
| ビタミンC | ナイアシンアミド |
| レチノール | AHA/BHA（グリコール酸・サリチル酸含む） |
| ビタミンC | レチノール |
| ビタミンC | AHA/BHA |
| 銅ペプチド | ビタミンC |
| 銅ペプチド | AHA/BHA |
| 過酸化ベンゾイル | レチノール |

## product_search.py の重要な実装メモ

Claude の web_search ツール（`web_search_20260209`）を使って製品情報を取得している。

**レスポンス構造の注意点：**
- Claude は複数の `text` ブロックを返す（最初は「検索します」などの説明文、途中にJSON、最後に補足説明）
- `next()` で最初のブロックを取ると説明文しか取れない
- `_extract_json_from_response()` で全 text ブロックを走査し、`{` で始まるブロックを探してパースする実装になっている
- `_strip_code_block()` でコードブロック（` ```json ``` `）を取り除いてからパースする

**検索方針：**
- 製品の存在が確認できたら `found: true` を返す（成分が不完全でもOK）
- `found: false` は製品が存在しないことが確認できた場合のみ
- 部分情報はフロントエンドの確認画面でユーザーが手入力できる

## BarcodeScanner.tsx の重要な実装メモ

`html5-qrcode` ライブラリを使ってスマホカメラでJANコードをスキャンする。

**React StrictMode との互換性：**
- StrictMode はエフェクトを2回実行する（mount → cleanup → mount）
- cleanup で `scanner.stop()` が呼ばれるとき、`start()` がまだ完了していない場合は同期例外を投げる
- `safeStop()` ユーティリティで try-catch + `.catch()` の両方を使って例外を握りつぶす
- `active` フラグでアンマウント後の `setCameraError` 呼び出しを防ぐ

**カメラ選択：**
- `facingMode: "environment"` では複数背面カメラ（広角・超広角）が選ばれることがある
- `Html5Qrcode.getCameras()` でカメラを列挙し、広角・超広角・マクロを除いたメインカメラをIDで指定する
- 取得失敗時は `facingMode: "environment"` にフォールバック

**Vite バンドル設定：**
- `html5-qrcode` はCJS依存（@zxing/library）を含むため `optimizeDeps.include` に明示的に追加する

**HTTPS要件：**
- Android Chrome・iOS Safari ともにHTTPSでないとカメラAPIが使えない
- 開発時は `@vitejs/plugin-basic-ssl` で自己署名証明書を自動付与する

**Open Beauty Facts APIのレスポンス構造：**
- `data.status === 1` かつ `data.product` がある場合のみ有効
- 成分リストは `p.ingredients[]` オブジェクト配列（`text` フィールド）→ `p.ingredients_text` テキストの順で取得
- カテゴリは `p.categories_tags[]` から `_inferCategory()` で推定する

## CORS・静的ファイル配信（main.py）

- `FRONTEND_ORIGIN` 環境変数でCORSオリジンを制御（未設定時は `localhost:5173,localhost:3000`）
- `static/` にビルド済みReactを配信・SPAフォールバック付き
- APIルーターを先に登録し、キャッチオールルートを最後に定義（APIが優先される）

## スマホアクセス（WSL2 + 有線LAN環境）

WindowsホストIP：`192.168.50.6`

PowerShell（管理者）でポートフォワーディングを設定してからサーバーを起動する。
詳細手順は README.md を参照。

アクセスURLは **`https://192.168.50.6:5173`**（HTTPSが必須）。
初回は自己署名証明書の警告が出るので「詳細設定」→「アクセスする」で許可する。

## 開発方針

- コメントは日本語で書く
- エラーハンドリングを必ず入れる
- APIキーは `.env` で管理し、Gitには絶対にあげない
- 成分の正規化処理を必ず実装する（別名・表記ゆれに対応）
- リーダブルコードを意識する（関数名は何をするかが一目でわかる名前、内部専用関数はアンダースコアプレフィックス）

## 実装進捗

- [x] Step 1: 土台作り（FastAPI初期化・.env・CORS）
- [x] Step 2: 製品管理API（CRUD + JSONファイル永続化）
- [x] Step 3: 成分チェックロジック（正規化・NGペア検出）
- [x] Step 4: Claude API連携（製品検索・ルーティン提案）
- [x] Step 5: Reactフロントエンド実装（Vite + TypeScript + Tailwind CSS）
- [x] Step 6: バーコードスキャン機能（html5-qrcode + Open Beauty Facts API）
- [x] Step 7: 気分モード拡充（5→10種）+ 天気・環境コンテキスト連携（Open-Meteo + 花粉トグル）
