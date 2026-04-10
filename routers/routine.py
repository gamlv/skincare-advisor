"""ルーティン提案エンドポイント"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services import product_store, routine_suggester

router = APIRouter(prefix="/routine", tags=["ルーティン提案"])

# 有効な気分モードのリスト
_VALID_MOODS = {
    "refresh", "relax", "thorough", "quick", "sensitive",
    "morning", "night", "brightening", "antiaging", "pore",
}


class WeatherContext(BaseModel):
    """フロントエンドから送られる天気・環境情報"""
    temperature: float        # 気温（℃）
    humidity: float           # 湿度（%）
    uv_index: float           # UV指数
    weather_label: str        # 天気ラベル（晴れ・曇り・雨 等）
    pollen: bool = False      # 花粉注意フラグ（手動トグル）


class RoutineSuggestRequest(BaseModel):
    mood: str                        # 気分モードのキー
    product_ids: list[str] = []      # 空の場合は全製品を対象にする
    weather: WeatherContext | None = None  # 天気コンテキスト（任意）


@router.post("/suggest")
def suggest_routine(request: RoutineSuggestRequest):
    """気分・天気に合わせたスキンケアルーティンを提案する"""
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

    weather_dict = request.weather.model_dump() if request.weather else None
    return routine_suggester.suggest_routine(products, request.mood, weather_dict)


def _get_specified_products(product_ids: list[str]):
    """IDリストから製品を取得し、見つからないIDがあれば404を返す。"""
    products = []
    for pid in product_ids:
        product = product_store.get_product_by_id(pid)
        if product is None:
            raise HTTPException(status_code=404, detail=f"製品が見つかりません：{pid}")
        products.append(product)
    return products
