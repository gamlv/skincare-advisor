"""製品データのJSONファイル永続化ユーティリティ"""

import json
from pathlib import Path
from models import Product, ProductCreate

# データファイルのパス（リポジトリルートからの相対パス）
_DATA_FILE = Path(__file__).parent.parent / "data" / "products.json"


def _read_all() -> list[dict]:
    """JSONファイルから全製品を読み込む（ファイルがなければ空リストを返す）"""
    if not _DATA_FILE.exists():
        return []
    return json.loads(_DATA_FILE.read_text(encoding="utf-8"))


def _write_all(products: list[dict]) -> None:
    """全製品をJSONファイルに書き込む"""
    _DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    _DATA_FILE.write_text(
        json.dumps(products, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def get_all_products() -> list[Product]:
    """全製品を取得する"""
    return [Product(**p) for p in _read_all()]


def get_product_by_id(product_id: str) -> Product | None:
    """IDで製品を1件取得する（見つからなければNoneを返す）"""
    all_products = _read_all()
    matched = [p for p in all_products if p["id"] == product_id]
    return Product(**matched[0]) if matched else None


def save_product(product: Product) -> None:
    """新しい製品を追加して保存する"""
    all_products = _read_all()
    all_products.append(product.model_dump())
    _write_all(all_products)


def update_product(product_id: str, data: ProductCreate) -> Product | None:
    """IDで製品を更新する（見つからなければNoneを返す）"""
    all_products = _read_all()
    for i, p in enumerate(all_products):
        if p["id"] == product_id:
            # id と created_at はそのまま保持し、他フィールドを上書き
            updated = {**p, **data.model_dump()}
            all_products[i] = updated
            _write_all(all_products)
            return Product(**updated)
    return None


def delete_product(product_id: str) -> bool:
    """IDで製品を削除する（削除できたらTrue、見つからなければFalseを返す）"""
    all_products = _read_all()
    filtered = [p for p in all_products if p["id"] != product_id]

    was_deleted = len(filtered) < len(all_products)
    if was_deleted:
        _write_all(filtered)

    return was_deleted
