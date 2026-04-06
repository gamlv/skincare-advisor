"""製品管理エンドポイント（登録・一覧・詳細・削除）"""

import uuid
from fastapi import APIRouter, HTTPException
from models import Product, ProductCreate
from services import product_store

router = APIRouter(prefix="/products", tags=["製品管理"])


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
