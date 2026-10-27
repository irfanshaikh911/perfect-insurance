from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from urllib.parse import quote, unquote

from app.core.config import settings
from app.schemas.plan import PlanOut, PlanSummaryOut, ProductDetailOut, ProductOut


PRODUCTS: tuple[tuple[str, str], ...] = (
    ("endowment", "Endowment Plans"),
    ("whole-life", "Whole Life Plans"),
    ("money-back", "Money Back Plans"),
    ("term", "Term Assurance Plans"),
    ("riders", "Riders"),
    ("pension", "Pension Plans"),
    ("ulip", "ULIP Plans"),
    ("health", "Health Plans"),
    ("micro", "Micro Insurance"),
    ("group", "Group Plans"),
    ("other", "Other Plans"),
)

PRODUCT_NAMES = dict(PRODUCTS)

KNOWN_PLAN_PRODUCTS = {
    "717": "endowment",
    "714": "endowment",
    "715": "endowment",
    "733": "endowment",
    "736": "endowment",
    "774": "endowment",
    "912": "endowment",
    "881": "endowment",
    "888": "endowment",
    "889": "endowment",
    "890": "endowment",
    "770": "endowment",
    "945": "whole-life",
    "920": "money-back",
    "921": "money-back",
    "932": "money-back",
    "875": "term",
    "876": "term",
    "880": "term",
    "758": "pension",
    "857": "pension",
    "862": "pension",
    "867": "ulip",
    "751": "micro",
}


def _category_from_text(folder: str, plan_name: str, product_url: str, product_name: str, plan_number: str | None) -> str:
    if plan_number and plan_number in KNOWN_PLAN_PRODUCTS:
        return KNOWN_PLAN_PRODUCTS[plan_number]

    blob = " ".join(
        [
            folder.replace("_", " ").replace("-", " "),
            plan_name,
            unquote(product_url or ""),
            product_name,
        ]
    ).lower()

    if folder.startswith("Group_") or " group " in f" {blob} ":
        return "group"
    if folder.startswith("Rider_") or "rider" in blob:
        return "riders"
    if "money back" in blob or "money-back" in blob:
        return "money-back"
    if "whole life" in blob or "whole-life" in blob or "jeevan umang" in blob:
        return "whole-life"
    if "ulip" in blob or "nivesh plus" in blob or "pension plus" in blob or "bima nivesh" in blob:
        return "ulip"
    if any(
        token in blob
        for token in ("pension", "annuity", "jeevan shanti", "jeevan akshay", "saral pension")
    ):
        return "pension"
    if "health" in blob or "cancer cover" in blob:
        return "health"
    if "micro" in blob:
        return "micro"
    if "term" in blob or "jan suraksha" in blob or "tech-term" in blob or "e-term" in blob:
        return "term"
    if any(
        token in blob
        for token in (
            "endowment",
            "jeevan anand",
            "jeevan labh",
            "jeevan lakshya",
            "bima jyoti",
            "amritbaal",
            "bima lakshmi",
            "jeevan sathi",
            "nav jeevan",
            "bima platinum",
        )
    ):
        return "endowment"
    return "other"


def _doc_label(doc_type: str, organized_path: str) -> str:
    stem = Path(organized_path).stem
    if stem == doc_type:
        return doc_type
    extra = stem[len(doc_type) :].lstrip("_").replace("_", " ")
    if extra:
        return f"{doc_type} ({extra})"
    return doc_type or "Document"


def _file_url(organized_path: str) -> str:
    relative = organized_path.split("lic_data/plans/", 1)[-1]
    encoded = "/".join(quote(part) for part in relative.split("/"))
    return f"/files/plans/{encoded}"


def _load_raw_documents() -> list[dict]:
    path = settings.documents_file
    if not path.exists():
        return []
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    return data if isinstance(data, list) else []


def _sort_plans(plans: list[PlanOut]) -> list[PlanOut]:
    return sorted(
        plans,
        key=lambda plan: (
            plan.plan_number is None,
            int(plan.plan_number) if plan.plan_number and plan.plan_number.isdigit() else 10_000,
            plan.plan_name.lower(),
        ),
    )


@lru_cache(maxsize=1)
def list_all_plans() -> tuple[PlanOut, ...]:
    grouped: dict[str, dict] = {}

    for row in _load_raw_documents():
        organized = row.get("organized_path")
        if not organized:
            continue
        if "/_Other/" in organized.replace("\\", "/"):
            continue

        relative = organized.split("lic_data/plans/", 1)[-1]
        parts = Path(relative).parts
        if len(parts) < 2:
            continue
        folder = parts[0]
        if folder == "_Other":
            continue

        plan = grouped.get(folder)
        if plan is None:
            product_id = _category_from_text(
                folder,
                row.get("plan_name") or folder,
                row.get("product_url") or "",
                row.get("product_name") or "",
                row.get("plan_number"),
            )
            plan = {
                "id": folder,
                "plan_number": row.get("plan_number"),
                "plan_name": row.get("plan_name") or folder,
                "uin": row.get("uin"),
                "product_id": product_id,
                "product_name": PRODUCT_NAMES[product_id],
                "docs": [],
            }
            grouped[folder] = plan
        else:
            if not plan["plan_number"] and row.get("plan_number"):
                plan["plan_number"] = row.get("plan_number")
            if not plan["uin"] and row.get("uin"):
                plan["uin"] = row.get("uin")

        doc_type = row.get("doc_type") or "Other"
        plan["docs"].append(
            {
                "type": doc_type,
                "label": _doc_label(doc_type, organized),
                "url": _file_url(organized),
            }
        )

    type_order = {"Brochure": 0, "Policy": 1, "CIS": 2}
    plans: list[PlanOut] = []
    for item in grouped.values():
        item["docs"].sort(key=lambda doc: (type_order.get(doc["type"], 9), doc["label"]))
        plans.append(PlanOut.model_validate(item))

    return tuple(_sort_plans(plans))


def _summary(plan: PlanOut) -> PlanSummaryOut:
    return PlanSummaryOut(
        id=plan.id,
        plan_number=plan.plan_number,
        plan_name=plan.plan_name,
        uin=plan.uin,
        product_id=plan.product_id,
        product_name=plan.product_name,
        doc_count=len(plan.docs),
    )


def get_products() -> list[ProductOut]:
    counts: dict[str, int] = {product_id: 0 for product_id, _ in PRODUCTS}
    for plan in list_all_plans():
        counts[plan.product_id] = counts.get(plan.product_id, 0) + 1
    return [
        ProductOut(id=product_id, name=name, plan_count=counts[product_id])
        for product_id, name in PRODUCTS
        if counts[product_id]
    ]


def get_product(product_id: str) -> ProductDetailOut | None:
    name = PRODUCT_NAMES.get(product_id)
    if name is None:
        return None
    plans = [_summary(plan) for plan in list_all_plans() if plan.product_id == product_id]
    if not plans:
        return None
    return ProductDetailOut(id=product_id, name=name, plan_count=len(plans), plans=plans)


def get_plans(q: str | None = None, product_id: str | None = None) -> list[PlanSummaryOut]:
    plans = list(list_all_plans())
    if product_id:
        plans = [plan for plan in plans if plan.product_id == product_id]
    if q:
        needle = q.strip().lower()
        plans = [
            plan
            for plan in plans
            if needle in plan.plan_name.lower()
            or needle in (plan.plan_number or "").lower()
            or needle in (plan.uin or "").lower()
            or needle in plan.id.lower()
            or needle in plan.product_name.lower()
        ]
    return [_summary(plan) for plan in plans]


def get_plan(plan_id: str) -> PlanOut | None:
    wanted = unquote(plan_id)
    for plan in list_all_plans():
        if plan.id == wanted:
            return plan
    return None
