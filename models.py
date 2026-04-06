"""アプリ全体で使うデータモデル定義"""

from pydantic import BaseModel, Field
from datetime import datetime, timezone


# カテゴリの選択肢（フロントのセレクトボックスと合わせる）
PRODUCT_CATEGORIES = ["洗顔", "化粧水", "美容液", "乳液", "クリーム", "日焼け止め", "その他"]

# 肌悩みの選択肢
SKIN_CONCERNS = ["乾燥", "ニキビ", "毛穴", "シミ", "敏感肌", "くすみ", "ハリ不足"]


class ProductCreate(BaseModel):
    """製品登録リクエスト（idとcreated_atはサーバー側で採番）"""
    name: str = Field(..., description="商品名")
    brand: str = Field(..., description="ブランド名")
    category: str = Field(..., description="カテゴリ")
    ingredients: list[str] = Field(default=[], description="成分リスト")
    concerns: list[str] = Field(default=[], description="対応する肌悩み")


class Product(ProductCreate):
    """DBに保存される製品（ProductCreateにid・日時を追加）"""
    id: str = Field(..., description="UUID")
    created_at: str = Field(..., description="登録日時（ISO8601）")

    @classmethod
    def new(cls, data: ProductCreate, product_id: str) -> "Product":
        """ProductCreateから新しいProductを生成するファクトリメソッド"""
        return cls(
            **data.model_dump(),
            id=product_id,
            created_at=datetime.now(timezone.utc).isoformat(),
        )
