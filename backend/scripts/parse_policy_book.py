#!/usr/bin/env python3
"""Parse LIC DataFilterBySumAssurd.pdf into Frontend/src/data/policyBook.json."""

from __future__ import annotations

import json
import re
from collections import OrderedDict
from datetime import date
from pathlib import Path

try:
    from pypdf import PdfReader
except ImportError as exc:  # pragma: no cover
    raise SystemExit("Install pypdf: pip install pypdf") from exc

ROOT = Path(__file__).resolve().parents[2]
PDF = ROOT / "backend" / "lic_data" / "DataFilterBySumAssurd.pdf"
OUT = ROOT / "Frontend" / "src" / "data" / "policyBook.json"
TODAY = date(2026, 10, 27)

PLAN_NAMES = {
    "914": "New Endowment Plan",
    "936": "Jeevan Labh",
    "920": "New Money Back Plan - 20 Years",
    "921": "New Money Back Plan - 25 Years",
    "904": "Jeevan Umang (Whole Life)",
    "876": "SIIP (Unit Linked)",
    "955": "Jeevan Amar (Term)",
    "857": "Jeevan Shanti (Pension)",
    "859": "Bhagya Lakshmi (Micro)",
    "714": "New Jeevan Anand",
    "715": "Jeevan Labh",
    "733": "Bima Jyoti",
    "736": "Jeevan Umang",
    "751": "New Children's Money Back",
    "720": "New Endowment",
    "758": "Single Premium Endowment",
    "880": "Tech Term",
    "815": "New Endowment",
    "149": "Jeevan Anand",
    "179": "Jeevan Saral",
    "933": "Jeevan Labh",
    "814": "New Endowment",
    "820": "Money Back",
    "165": "Money Back",
    "827": "Jeevan Anand",
    "944": "Jeevan Azad",
    "915": "New Endowment",
    "106": "Endowment Assurance",
    "174": "Jeevan Anand",
    "75": "Money Back",
    "91": "New Bima Bachat",
    "14": "Jeevan Anand",
    "90": "Jeevan Shree",
    "102": "Endowment",
    "103": "Jeevan Ankur",
    "833": "Jeevan Labh",
}

ROW_RE = re.compile(
    r"^(?P<sno>\d{1,4})\s+"
    r"(?P<policy>\d{9})\s+"
    r"(?P<name>.+?)\s+"
    r"(?P<plan>\d{1,3})/(?P<term>\d{1,3})/(?P<ppt>\d{1,3})\s+"
    r"(?P<sa>[\d,]+)\s+"
    r"(?P<doc>\d{2}/\d{2}/\d{2,4}|\d{4}/\d{2}/\d{2}|99/99/9999)\s+"
    r"(?P<mode>Half[-\s]?Yearly|Yearly|Quarterly|Monthly|Single|NF)\s+"
    r"(?P<fup>\d{2}/\d{2}/\d{2,4}|\d{4}/\d{2}/\d{2}|99/99/9999)\s+"
    r"(?P<premium>[\d,]+)\s+"
    r"(?P<dom>\d{2}/\d{2}/\d{2,4}|\d{4}/\d{2}/\d{2}|99/99/9999)"
    r"(?:\s+(?P<dob>\d{2}/\d{2}/\d{2,4}|\d{4}/\d{2}/\d{2}))?"
    r"\s*$",
    re.IGNORECASE,
)


def parse_indian_num(s: str) -> int:
    return int(s.replace(",", ""))


def parse_date(s: str | None) -> date | None:
    if not s or s == "99/99/9999":
        return None
    m = re.match(r"^(\d{2})/(\d{2})/(\d{2,4})$", s)
    if m:
        d, mo, y = int(m.group(1)), int(m.group(2)), m.group(3)
        if len(y) == 2:
            y_i = 2000 + int(y)
        elif len(y) == 3:
            y_i = int(y) * 10
            if y_i > 2100:
                return None
        else:
            y_i = int(y)
        try:
            return date(y_i, mo, d)
        except ValueError:
            return None
    m = re.match(r"^(\d{4})/(\d{2})/(\d{2})$", s)
    if m:
        try:
            return date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
        except ValueError:
            return None
    return None


def iso(d: date | None) -> str | None:
    return d.isoformat() if d else None


def map_mode(raw: str) -> str:
    compact = re.sub(r"[\s_]+", "-", raw.strip()).lower()
    if compact == "yearly":
        return "Yearly"
    if compact in ("half-yearly", "halfyearly"):
        return "Half-Yearly"
    if compact == "quarterly":
        return "Quarterly"
    if compact == "monthly":
        return "Monthly"
    return "Yearly"


def status_for(dom: date | None, fup: date | None) -> str:
    if dom and dom < TODAY:
        return "Matured"
    if fup and (TODAY - fup).days > 60:
        return "Lapsed"
    return "Active"


def title_name(name: str) -> str:
    name = re.sub(r"\s+", " ", name).strip(" ,./")
    if name.isupper() and len(name) > 3:
        return name.title()
    return name


def norm_key(name: str, dob: str | None) -> str:
    n = re.sub(r"[^a-z0-9]+", "", name.lower())
    return f"{n}|{dob or 'nodob'}"


def main() -> None:
    if not PDF.exists():
        raise SystemExit(f"Missing PDF: {PDF}")

    text = "\n".join((p.extract_text() or "") for p in PdfReader(str(PDF)).pages)
    lines = [re.sub(r"[ \t]+", " ", ln).strip() for ln in text.splitlines() if ln.strip()]
    glued = re.compile(r"([A-Za-z])(\d{1,3}/\d{1,3}/\d{1,3}\b)")
    lines = [glued.sub(r"\1 \2", ln) for ln in lines]

    rows: list[dict] = []
    failed = 0
    for ln in lines:
        if not re.match(r"^\d+\s+\d{9}\b", ln):
            continue
        m = ROW_RE.match(ln)
        if not m:
            failed += 1
            print("FAIL:", ln[:180])
            continue
        g = m.groupdict()
        doc = parse_date(g["doc"])
        fup = parse_date(g["fup"])
        dom = parse_date(g["dom"])
        dob = parse_date(g["dob"]) if g.get("dob") else None
        due = fup or doc or TODAY
        rows.append(
            {
                "name": title_name(g["name"]),
                "policyNo": g["policy"],
                "planCode": g["plan"],
                "term": int(g["term"]),
                "ppt": int(g["ppt"]),
                "sumAssured": parse_indian_num(g["sa"]),
                "doc": iso(doc),
                "mode": map_mode(g["mode"]),
                "premium": parse_indian_num(g["premium"]),
                "dom": iso(dom),
                "dob": iso(dob),
                "dueDate": iso(due),
                "status": status_for(dom, fup),
            }
        )

    groups: OrderedDict[str, list] = OrderedDict()
    for r in rows:
        groups.setdefault(norm_key(r["name"], r["dob"]), []).append(r)

    clients: list[dict] = []
    policies: list[dict] = []
    follow_ups: list[dict] = []

    for idx, (_, plist) in enumerate(groups.items(), start=1):
        cid = f"c{idx}"
        first = plist[0]
        dob = next((p["dob"] for p in plist if p["dob"]), None) or "1990-01-01"
        total_sa = sum(p["sumAssured"] for p in plist)
        tags: list[str] = []
        if total_sa >= 500_000:
            tags.append("High Value")
        if any(p["status"] == "Lapsed" for p in plist):
            tags.append("Lapse Risk")
        docs = [p["doc"] for p in plist if p["doc"]]
        clients.append(
            {
                "id": cid,
                "name": first["name"],
                "phone": "",
                "email": "",
                "dob": dob,
                "address": "",
                "tags": tags,
                "autoReminders": True,
                "family": [],
                "notes": [],
                "documents": [],
                "messages": [],
                "createdAt": min(docs) if docs else TODAY.isoformat(),
            }
        )
        for j, p in enumerate(plist, start=1):
            plan_name = PLAN_NAMES.get(p["planCode"], f"LIC Plan {p['planCode']}")
            policies.append(
                {
                    "id": f"p{idx}_{j}",
                    "clientId": cid,
                    "policyNumber": p["policyNo"],
                    "planCode": p["planCode"],
                    "planName": f"{plan_name} ({p['planCode']}/{p['term']}/{p['ppt']})",
                    "sumAssured": p["sumAssured"],
                    "premium": p["premium"],
                    "mode": p["mode"],
                    "dueDate": p["dueDate"],
                    "status": p["status"],
                }
            )

    active_dues = [p for p in policies if p["status"] == "Active"]

    def days_until(iso_s: str) -> int:
        return (date.fromisoformat(iso_s) - TODAY).days

    near = sorted(
        [p for p in active_dues if 0 <= days_until(p["dueDate"]) <= 14],
        key=lambda p: p["dueDate"],
    )[:5]
    lapsed = [p for p in policies if p["status"] == "Lapsed"][:3]
    for i, p in enumerate(near, 1):
        follow_ups.append(
            {
                "id": f"f{i}",
                "clientId": p["clientId"],
                "text": f"Premium due soon — policy {p['policyNumber']}",
                "done": False,
            }
        )
    base = len(follow_ups)
    for i, p in enumerate(lapsed, 1):
        follow_ups.append(
            {
                "id": f"f{base + i}",
                "clientId": p["clientId"],
                "text": f"Lapsed policy revival — {p['policyNumber']}",
                "done": False,
            }
        )

    payload = {
        "source": "DataFilterBySumAssurd.pdf",
        "generatedAt": TODAY.isoformat(),
        "stats": {
            "policies": len(policies),
            "clients": len(clients),
            "active": sum(1 for p in policies if p["status"] == "Active"),
            "lapsed": sum(1 for p in policies if p["status"] == "Lapsed"),
            "matured": sum(1 for p in policies if p["status"] == "Matured"),
            "parseFailedLines": failed,
        },
        "clients": clients,
        "policies": policies,
        "followUps": follow_ups,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")))
    print(f"Wrote {OUT}")
    print(payload["stats"])


if __name__ == "__main__":
    main()
