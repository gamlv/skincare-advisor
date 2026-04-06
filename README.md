# スキンケアアドバイザー

妻が実際に使うスキンケア用品管理・ルーティン提案サービス。
所有しているスキンケア用品を登録し、その日の気分に合わせて成分的にNGな組み合わせを除外した最適なルーティンを提案する。

---

## セットアップ

```bash
# 仮想環境の有効化
source .venv/bin/activate

# 依存関係のインストール
uv sync

# .envを作成してAPIキーを設定
cp .env.example .env
# ANTHROPIC_API_KEY を設定する

# 開発サーバー起動
uvicorn main:app --reload
```

---

## 技術スタック

| 用途 | 技術 |
|------|------|
| バックエンドAPI | Python 3.12 + FastAPI + Uvicorn |
| AI連携 | Anthropic Claude API（claude-sonnet-4-6） |
| データ保存 | JSONファイル（`data/products.json`） |
| 環境管理 | uv + python-dotenv |
| フロントエンド | 別途検討（Reactアプリを移植予定） |

---

## API エンドポイント一覧

| Method | Path | 説明 | 状態 |
|--------|------|------|------|
| GET | `/` | ヘルスチェック | ✅ 実装済み |
| GET | `/docs` | Swagger UI | ✅ 自動生成 |
| GET | `/products` | 全製品一覧 | ✅ 実装済み |
| POST | `/products` | 製品登録 | ✅ 実装済み |
| GET | `/products/{id}` | 製品詳細 | ✅ 実装済み |
| DELETE | `/products/{id}` | 製品削除 | ✅ 実装済み |
| POST | `/products/search` | 製品名でWeb検索・情報取得 | ✅ 実装済み |
| POST | `/routine/suggest` | 気分に合わせたルーティン提案 | ✅ 実装済み |

---

## ディレクトリ構成

```
main.py                      # FastAPIアプリ初期化・ルーター登録・CORS設定
models.py                    # PydanticモデルとDB定数（ProductCreate, Product）
.env                         # APIキー（Gitに含めない）
.env.example                 # 環境変数テンプレート
routers/
  products.py                # 製品CRUD エンドポイント ✅
  routine.py                 # ルーティン提案エンドポイント（未実装）
services/
  product_store.py           # data/products.json への読み書き ✅
  ingredient_checker.py      # 成分正規化・NGペア検出 ✅
  product_search.py          # Claude API web_search連携 ✅
  routine_suggester.py       # Claude API ルーティン提案 ✅
data/
  products.json              # 製品データ（JSONファイルで永続化）✅
static/                      # 静的ファイル（将来のフロントエンド用）
```

---

## データモデル

### Product

```json
{
  "id": "uuid（サーバー採番）",
  "name": "シカクリーム",
  "brand": "Dr.Jart+",
  "category": "クリーム",
  "ingredients": ["ツボクサエキス", "セラミド"],
  "concerns": ["敏感肌", "乾燥"],
  "created_at": "2026-04-06T00:00:00+00:00"
}
```

**category の選択肢：** 洗顔 / 化粧水 / 美容液 / 乳液 / クリーム / 日焼け止め / その他

**concerns の選択肢：** 乾燥 / ニキビ / 毛穴 / シミ / 敏感肌 / くすみ / ハリ不足

---

## 気分モードと提案方針

| キー | 日本語 | 提案方針 |
|------|--------|---------|
| `refresh` | リフレッシュ | 爽やかさ重視・さっぱり系製品を優先 |
| `relax` | リラックス | 保湿重視・じっくりケア |
| `thorough` | しっかりケア | フル工程・全ステップ使用 |
| `quick` | 時短 | 最小手順・必須ケアのみ |
| `sensitive` | 肌荒れ | 刺激成分を除外・低刺激製品を優先 |

---

## 成分NGペア一覧

以下の組み合わせは自動的に検出・除外される（`services/ingredient_checker.py` で管理）。

| 成分A | 成分B | 理由 |
|-------|-------|------|
| ビタミンC | ナイアシンアミド | 効果を打ち消し合う |
| レチノール | AHA/BHA | 過剰な角質除去・刺激 |
| ビタミンC | レチノール | 酸化・分解促進 |
| ビタミンC | AHA/BHA | pH競合で効果減少 |
| 銅ペプチド | ビタミンC | 銅イオンがビタミンCを酸化 |
| 銅ペプチド | AHA/BHA | ペプチド結合の破壊 |
| 過酸化ベンゾイル | レチノール | 酸化によるレチノール分解 |

成分は別名・表記ゆれを正規化して判定する（例：アスコルビン酸 → ビタミンC、グリコール酸 → AHA）。

---

## 実装進捗

- [x] Step 1: 土台作り（FastAPI初期化・.env・CORS）
- [x] Step 2: 製品管理API（CRUD + JSONファイル永続化）
- [x] Step 3: 成分チェックロジック（正規化・NGペア検出）
- [x] Step 4: Claude API連携（製品検索・ルーティン提案）
- [ ] Step 5: フロントエンド連携準備（CORS本番化・静的ファイル配信）
