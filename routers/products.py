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


class ProductSearchResponse(BaseModel):
    """検索結果（ユーザーが確認後に /products POST で登録する）"""
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


@router.delete("/{product_id}", status_code=204)
def delete_product(product_id: str):
    """IDで製品を削除する"""
    was_deleted = product_store.delete_product(product_id)
    if not was_deleted:
        raise HTTPException(status_code=404, detail="製品が見つかりません")


@router.post("/search", response_model=ProductSearchResponse)
def search_product(request: ProductSearchRequest):
    """製品名でWeb検索して情報を取得する（登録はしない）"""
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="検索ワードを入力してください")

    result = product_search.search_product_info(request.query)
    return ProductSearchResponse(**result)
