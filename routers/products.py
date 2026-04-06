"""製品管理エンドポイント（登録・一覧・詳細・削除・検索）"""

import uuid
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from models import Product, ProductCreate
from services import product_store
from services import product_search

router = APIRouter(prefix="/products", tags=["製品管理"])


class ProductSearchRequest(BaseModel):
    query: str  # 検索する製品名


class SearchCandidateResponse(BaseModel):
    """候補検索の結果"""
    name: str
    brand: str
    category: str = "その他"
    description: str = ""


class ProductSearchResponse(BaseModel):
    """詳細検索の結果（ユーザーが確認後に /products POST で登録する）"""
    found: bool
    name: str = ""
    brand: str = ""
    category: str = "その他"
    ingredients: list[str] = []
    concerns: list[str] = []


@router.get("", response_model=list[Product])
def list_products():
    """登録済みの全製品を取得する"""
    return product_store.get_all_products()


@router.post("", response_model=Product, status_code=201)
def create_product(data: ProductCreate):
    """新しい製品を登録する"""
    product = Product.new(data, product_id=str(uuid.uuid4()))
    product_store.save_product(product)
    return product


@router.get("/{product_id}", response_model=Product)
def get_product(product_id: str):
    """IDで製品を1件取得する"""
    product = product_store.get_product_by_id(product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="製品が見つかりません")
    return product


@router.put("/{product_id}", response_model=Product)
def update_product(product_id: str, data: ProductCreate):
    """IDで製品情報を更新する"""
    updated = product_store.update_product(product_id, data)
    if updated is None:
        raise HTTPException(status_code=404, detail="製品が見つかりません")
    return updated


@router.delete("/{product_id}", status_code=204)
def delete_product(product_id: str):
    """IDで製品を削除する"""
    was_deleted = product_store.delete_product(product_id)
    if not was_deleted:
        raise HTTPException(status_code=404, detail="製品が見つかりません")


@router.post("/search/candidates", response_model=list[SearchCandidateResponse])
def search_candidates(request: ProductSearchRequest):
    """あいまい検索で候補製品を複数返す（軽量・高速）"""
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="検索ワードを入力してください")

    candidates = product_search.search_candidates(request.query)
    return [SearchCandidateResponse(**c) for c in candidates]


@router.post("/search", response_model=ProductSearchResponse)
def search_product(request: ProductSearchRequest):
    """特定の製品名で詳細検索（成分情報を含む）"""
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="検索ワードを入力してください")

    result = product_search.search_product_info(request.query)
    return ProductSearchResponse(**result)
