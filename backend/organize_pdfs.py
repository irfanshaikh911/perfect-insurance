#!/usr/bin/env python3
"""
Copy downloaded LIC PDFs into lic_data/plans/ named by plan.

Original files in lic_data/pdfs/ are never moved or renamed.
documents.json local_path is left unchanged; organized_path is added.
"""

from __future__ import annotations

import json
import re
import shutil
from collections import defaultdict
from pathlib import Path
from urllib.parse import unquote


BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "lic_data"
DOCUMENTS_FILE = DATA_DIR / "documents.json"
SOURCE_DIR = DATA_DIR / "pdfs"
DEST_DIR = DATA_DIR / "plans"

YEAR_LIKE = {
    "20121",
    "2020",
    "2021",
    "2022",
    "2023",
    "2024",
    "2025",
    "2026",
}

OTHER_TYPES = {"NAV", "FAQ", "Form"}
OTHER_NAME_HINTS = {
    "navigation",
    "awards",
    "features",
    "micro insurance forms",
    "gratuity plus nav",
}


def load_documents():
    with DOCUMENTS_FILE.open("r", encoding="utf-8") as f:
        return json.load(f)


def save_documents(documents):
    with DOCUMENTS_FILE.open("w", encoding="utf-8") as f:
        json.dump(documents, f, indent=2, ensure_ascii=False)
        f.write("\n")


def clean_product_name(name: str) -> str:
    name = name or ""
    name = re.split(r"\s*\|\s*Official", name, maxsplit=1)[0]
    name = name.replace("\n", " ").replace("\t", " ")
    name = unquote(name)
    name = re.sub(r"\s+", " ", name).strip()
    return name


def extract_uin(*parts: str) -> str | None:
    blob = " ".join(p or "" for p in parts)
    match = re.search(r"(512[A-Z]\d{3}V\d{2})", blob, re.I)
    return match.group(1).upper() if match else None


def extract_plan_no(product_name: str, product_url: str) -> str | None:
    name = clean_product_name(product_name)
    url = unquote((product_url or "").replace("%09", "-"))
    blob = f"{name} {url}"

    patterns = [
        r"plan\s*no\.?\s*[:\-]?\s*(\d{2,4})",
        r"[-_/](\d{3,4})[-_/]512",
        r"\b(\d{3,4})\s*512[A-Z]",
        r"\b(\d{3,4})\s+UIN",
    ]

    for pattern in patterns:
        match = re.search(pattern, blob, re.I)
        if match:
            number = match.group(1)
            if number not in YEAR_LIKE:
                return str(int(number))

    stripped = re.sub(r"512[A-Z]\d{3}V\d{2}", "", name, flags=re.I)
    stripped = re.sub(r"\([^)]*\)", "", stripped).strip()
    match = re.search(r"\b(\d{2,4})\s*$", stripped)
    if match and match.group(1) not in YEAR_LIKE:
        return str(int(match.group(1)))

    return None


def plan_title(product_name: str, product_url: str, plan_no: str | None) -> str:
    name = clean_product_name(product_name)
    name = re.sub(r"\([^)]*plan\s*no[^)]*\)", "", name, flags=re.I)
    name = re.sub(r"\([^)]*uin[^)]*\)", "", name, flags=re.I)
    name = re.sub(r"UIN\s*(No\.?)?\s*:?\s*512[A-Z]\d{3}V\d{2}", "", name, flags=re.I)
    name = re.sub(r"512[A-Z]\d{3}V\d{2}", "", name, flags=re.I)
    name = re.sub(r"UIN\s*(No\.?)?\s*:?\s*", "", name, flags=re.I)
    name = re.sub(r"\(?\s*Plan\s*No\.?\s*:?\s*\d{2,4}\s*\)?", "", name, flags=re.I)
    if plan_no:
        name = re.sub(rf"\b{re.escape(plan_no)}\b", "", name)
    name = re.sub(r"^LIC['’`]s\s+", "", name, flags=re.I)
    name = re.sub(r"^LIC['’`]?\s+", "", name, flags=re.I)
    name = re.sub(r"\s+", " ", name)
    name = name.strip(" -–_|,;()")

    if not name or name.lower() in {"navigation", "official website"}:
        slug = unquote((product_url or "").rstrip("/").split("/")[-1])
        slug = re.sub(r"[-_]+", " ", slug)
        slug = re.sub(r"\b512[a-z]\d{3}v\d{2}\b", "", slug, flags=re.I)
        name = re.sub(r"\s+", " ", slug).strip(" -")

    return name or "Unknown-Plan"


def slugify(text: str, max_len: int = 70) -> str:
    text = (text or "").replace("&", " and ")
    text = re.sub(r"[^A-Za-z0-9]+", "-", text)
    text = re.sub(r"-{2,}", "-", text).strip("-")
    return text[:max_len].strip("-") or "Unknown-Plan"


def doc_type(link_text: str, url: str, path: str) -> str:
    blob = " ".join([link_text or "", unquote(url or ""), path or ""]).lower()

    if re.search(r"\bfaqs?\b", blob):
        return "FAQ"
    if "gratuity plus nav" in blob or re.search(r"\bnav\b", blob) and "brochure" not in blob and "policy" not in blob:
        return "NAV"
    if any(
        token in blob
        for token in (
            "proposal",
            "claim_form",
            "claim form",
            "annexure",
            "premium_rate",
            "mi_death",
            "micro-insurance-forms",
            "micro insurance forms",
        )
    ):
        return "Form"
    if re.search(r"\bcis\b", blob) or "cis_" in blob or "cis " in blob:
        return "CIS"
    if "policy" in blob:
        return "Policy"
    if any(
        token in blob
        for token in (
            "brochure",
            "broucher",
            "sales literature",
            "leaflet",
            "माहितीपत्रके",
        )
    ):
        return "Brochure"
    return "Other"


def date_suffix(link_text: str) -> str:
    text = link_text or ""
    match = re.search(r"From\s+([\d/]+)\s+To\s+([\d/]+)", text, re.I)
    if match:
        start = match.group(1).replace("/", "-")
        end = match.group(2).replace("/", "-")
        return f"_{start}_to_{end}"

    match = re.search(r"Upto\s+([\d/]+)", text, re.I)
    if match:
        return f"_upto_{match.group(1).replace('/', '-')}"

    if re.search(r"onwards", text, re.I):
        match = re.search(r"From\s+([\d/]+)", text, re.I)
        if match:
            return f"_from_{match.group(1).replace('/', '-')}_onwards"
        return "_current"

    return ""


def folder_name(plan_no: str | None, title: str, product_url: str, product_name: str, doc_kind: str) -> str:
    slug = slugify(title)
    combined = f"{product_name} {product_url} {title}".lower()

    if doc_kind in OTHER_TYPES or title.lower() in OTHER_NAME_HINTS:
        prefix = "_Other"
        if plan_no:
            return f"{prefix}/{plan_no}_{slug}"
        return f"{prefix}/{slug}"

    if plan_no:
        return f"{plan_no}_{slug}"
    if "group" in combined:
        return f"Group_{slug}"
    if "rider" in combined:
        return f"Rider_{slug}"
    return slug


def unique_destination(dest_dir: Path, filename: str) -> Path:
    candidate = dest_dir / filename
    if not candidate.exists():
        return candidate

    stem = candidate.stem
    suffix = candidate.suffix
    counter = 2
    while True:
        candidate = dest_dir / f"{stem}_{counter}{suffix}"
        if not candidate.exists():
            return candidate
        counter += 1


def source_path(local_path: str) -> Path:
    path = Path(local_path)
    if path.is_absolute():
        return path
    return BASE_DIR / path


def organize():
    documents = load_documents()
    DEST_DIR.mkdir(parents=True, exist_ok=True)

    copied = 0
    skipped = 0
    missing = 0
    folder_counts: dict[str, int] = defaultdict(int)

    for document in documents:
        if not document.get("downloaded") or not document.get("local_path"):
            document["organized_path"] = None
            continue

        src = source_path(document["local_path"])
        if not src.exists():
            document["organized_path"] = None
            missing += 1
            print(f"[MISSING] {src}")
            continue

        product_name = document.get("product_name") or ""
        product_url = document.get("product_url") or ""
        link_text = document.get("link_text") or ""
        url = document.get("url") or ""

        plan_no = extract_plan_no(product_name, product_url)
        uin = extract_uin(product_name, product_url, link_text, unquote(url))
        title = plan_title(product_name, product_url, plan_no)
        kind = doc_type(link_text, url, document.get("local_path") or "")
        suffix = date_suffix(link_text)
        relative_folder = folder_name(plan_no, title, product_url, product_name, kind)
        dest_folder = DEST_DIR / relative_folder
        dest_folder.mkdir(parents=True, exist_ok=True)

        filename = f"{kind}{suffix}.pdf"
        dest = unique_destination(dest_folder, filename)
        shutil.copy2(src, dest)

        organized = dest.relative_to(BASE_DIR).as_posix()
        document["organized_path"] = organized
        document["plan_number"] = plan_no
        document["plan_name"] = title
        document["uin"] = uin
        document["doc_type"] = kind

        copied += 1
        folder_counts[relative_folder] += 1
        print(f"[COPY] {src.name} -> {organized}")

    save_documents(documents)

    print("\n" + "=" * 70)
    print("ORGANIZE COMPLETE")
    print("=" * 70)
    print(f"Copied              : {copied}")
    print(f"Missing source      : {missing}")
    print(f"Plan folders        : {len(folder_counts)}")
    print(f"Originals unchanged : {SOURCE_DIR}")
    print(f"New organized dir   : {DEST_DIR}")


if __name__ == "__main__":
    organize()
