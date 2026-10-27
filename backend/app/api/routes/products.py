from fastapi import APIRouter, HTTPException

from app.schemas.plan import ProductDetailOut, ProductOut
from app.services.plan_catalog import get_product, get_products

router = APIRouter(prefix="/products", tags=["products"])


@router.get("", response_model=list[ProductOut])
def list_products() -> list[ProductOut]:
    return get_products()


@router.get("/{product_id}", response_model=ProductDetailOut)
def read_product(product_id: str) -> ProductDetailOut:
    product = get_product(product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return product
