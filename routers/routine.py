"""ルーティン提案エンドポイント"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services import product_store, routine_suggester

router = APIRouter(prefix="/routine", tags=["ルーティン提案"])

# 有効な気分モードのリスト
_VALID_MOODS = {"refresh", "relax", "thorough", "quick", "sensitive"}


class RoutineSuggestRequest(BaseModel):
    mood: str               # 気分モードのキー
    product_ids: list[str] = []  # 空の場合は全製品を対象にする


@router.post("/suggest")
def suggest_routine(request: RoutineSuggestRequest):
    """気分に合わせたスキンケアルーティンを提案する"""
    if request.mood not in _VALID_MOODS:
        raise HTTPException(
            status_code=400,
            detail=f"無効な気分モードです。有効な値：{', '.join(sorted(_VALID_MOODS))}"
        )

    # 対象製品を取得（指定がなければ全製品）
    if request.product_ids:
        products = _get_specified_products(request.product_ids)
    else:
        products = product_store.get_all_products()

    if not products:
        raise HTTPException(status_code=404, detail="製品が登録されていません")

    return routine_suggester.suggest_routine(products, request.mood)


def _get_specified_products(product_ids: list[str]):
    """IDリストから製品を取得し、見つからないIDがあれば404を返す。"""
    products = []
    for pid in product_ids:
        product = product_store.get_product_by_id(pid)
        if product is None:
            raise HTTPException(status_code=404, detail=f"製品が見つかりません：{pid}")
        products.append(product)
    return products
