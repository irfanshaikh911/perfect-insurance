from fastapi import APIRouter, HTTPException, Query

from app.schemas.plan import PlanOut, PlanSummaryOut
from app.services.plan_catalog import get_plan, get_plans

router = APIRouter(prefix="/plans", tags=["plans"])


@router.get("", response_model=list[PlanSummaryOut])
def list_plans(
    q: str | None = Query(default=None),
    product: str | None = Query(default=None),
) -> list[PlanSummaryOut]:
    return get_plans(q=q, product_id=product)


@router.get("/{plan_id}", response_model=PlanOut)
def read_plan(plan_id: str) -> PlanOut:
    plan = get_plan(plan_id)
    if plan is None:
        raise HTTPException(status_code=404, detail="Plan not found")
    return plan
