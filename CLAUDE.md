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

# 開発サーバー起動（仮想環境を有効化していない場合）
.venv/bin/uvicorn main:app --reload

# 開発サーバー起動（仮想環境を有効化済みの場合）
uvicorn main:app --reload
```

## 技術スタック

- Python 3.12 / uv（環境管理）
- **FastAPI** + **Uvicorn**（バックエンドAPI）
- **Anthropic Claude API**（提案生成・製品検索）
- **python-dotenv**（`.env` からAPIキーを読み込み）
- フロントエンドは別途検討（Reactベースのアプリを移植予定）

## ディレクトリ構成と各ファイルの役割

```
main.py                      # FastAPIアプリ初期化・ルーター登録・CORS設定
models.py                    # PydanticモデルとDB定数（ProductCreate, Product）
.env                         # APIキー（Gitに含めない）
.env.example                 # 環境変数テンプレート

routers/
  products.py                # 製品CRUD + 検索エンドポイント

services/
  product_store.py           # data/products.jsonへの読み書き
  ingredient_checker.py      # 成分正規化・NGペア検出（未実装）
  product_search.py          # Claude API web_search連携（未実装）
  routine_suggester.py       # Claude APIルーティン提案（未実装）

data/
  products.json              # 製品データ（JSONファイルで永続化）

static/                      # 静的ファイル（将来のフロントエンド用）
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
- **製品検索**：製品名でWeb検索して情報を自動取得（Claude API + web_search）（未実装）
- **気分選択**：リフレッシュ・リラックス・しっかりケア・時短・肌荒れの5種類（未実装）
- **ルーティン提案**：気分に合わせてClaude APIが最適な組み合わせを提案（未実装）
- **成分相性チェック**：NGな組み合わせを自動検出して除外（未実装）

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

## 開発方針

- コメントは日本語で書く
- エラーハンドリングを必ず入れる
- APIキーは `.env` で管理し、Gitには絶対にあげない
- 成分の正規化処理を必ず実装する（別名・表記ゆれに対応）
- リーダブルコードを意識する（関数名は何をするかが一目でわかる名前、内部専用関数はアンダースコアプレフィックス）
