from typing import Optional

from pydantic import BaseModel


class PlanDocumentOut(BaseModel):
    type: str
    label: str
    url: str


class ProductOut(BaseModel):
    id: str
    name: str
    plan_count: int


class PlanSummaryOut(BaseModel):
    id: str
    plan_number: Optional[str] = None
    plan_name: str
    uin: Optional[str] = None
    product_id: str
    product_name: str
    doc_count: int


class ProductDetailOut(BaseModel):
    id: str
    name: str
    plan_count: int
    plans: list[PlanSummaryOut]


class PlanOut(BaseModel):
    id: str
    plan_number: Optional[str] = None
    plan_name: str
    uin: Optional[str] = None
    product_id: str
    product_name: str
    docs: list[PlanDocumentOut]
