import re
import uuid
from datetime import date, datetime
from pathlib import Path
from typing import Any, Optional
import openpyxl
from pypdf import PdfReader
from sqlalchemy.orm import Session

from app.models.client_policy import Client, Policy

TODAY = date.today()

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

PDF_ROW_RE = re.compile(
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


def parse_clean_number(val: Any) -> float:
    if val is None:
        return 0.0
    if isinstance(val, (int, float)):
        return float(val)
    s = str(val).replace(",", "").replace("₹", "").replace("$", "").strip()
    try:
        return float(s)
    except ValueError:
        return 0.0


def parse_clean_date(val: Any) -> Optional[date]:
    if val is None:
        return None
    if isinstance(val, date):
        return val
    if isinstance(val, datetime):
        return val.date()

    s = str(val).strip()
    if not s or s == "99/99/9999" or s == "-":
        return None

    # Check DD/MM/YYYY or DD-MM-YYYY
    m1 = re.match(r"^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$", s)
    if m1:
        d, mo, y = int(m1.group(1)), int(m1.group(2)), m1.group(3)
        y_int = int(y)
        if len(y) == 2:
            y_int = 2000 + y_int if y_int < 70 else 1900 + y_int
        elif len(y) == 3:
            y_int = y_int * 10
        try:
            return date(y_int, mo, d)
        except ValueError:
            return None

    # Check YYYY-MM-DD
    m2 = re.match(r"^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$", s)
    if m2:
        try:
            return date(int(m2.group(1)), int(m2.group(2)), int(m2.group(3)))
        except ValueError:
            return None

    return None


def clean_mode(raw: Any) -> str:
    if not raw:
        return "Yearly"
    s = str(raw).strip().lower()
    if "half" in s or s in ("h", "hy", "hly"):
        return "Half-Yearly"
    if "quarter" in s or s in ("q", "qly"):
        return "Quarterly"
    if "month" in s or s in ("m", "mly", "ecs", "nach"):
        return "Monthly"
    if "single" in s or s == "s":
        return "Single"
    return "Yearly"


def calculate_status(dom: Optional[date], fup: Optional[date]) -> str:
    if dom and dom < TODAY:
        return "Matured"
    if fup and (TODAY - fup).days > 60:
        return "Lapsed"
    return "Active"


def clean_name(name: str) -> str:
    name = re.sub(r"\s+", " ", str(name)).strip(" ,./")
    if name.isupper() and len(name) > 3:
        return name.title()
    return name


def parse_lic_pdf(file_path: Path) -> list[dict]:
    reader = PdfReader(str(file_path))
    records = []

    for page in reader.pages:
        text = page.extract_text() or ""
        for raw_line in text.splitlines():
            line = raw_line.strip()
            if not line:
                continue

            m = PDF_ROW_RE.match(line)
            if not m:
                continue

            policy_no = m.group("policy").strip()
            client_name = clean_name(m.group("name"))
            plan_code = m.group("plan").strip()
            term = int(m.group("term")) if m.group("term") else None
            ppt = int(m.group("ppt")) if m.group("ppt") else None
            sa = parse_clean_number(m.group("sa"))
            premium = parse_clean_number(m.group("premium"))
            mode = clean_mode(m.group("mode"))
            doc = parse_clean_date(m.group("doc"))
            fup = parse_clean_date(m.group("fup"))
            dom = parse_clean_date(m.group("dom"))
            dob = parse_clean_date(m.group("dob")) if m.group("dob") else None

            plan_name = PLAN_NAMES.get(plan_code, f"LIC Plan {plan_code}")
            status = calculate_status(dom, fup)

            records.append({
                "policy_number": policy_no,
                "client_name": client_name,
                "plan_code": plan_code,
                "plan_name": plan_name,
                "term": term,
                "ppt": ppt,
                "sum_assured": sa,
                "premium": premium,
                "mode": mode,
                "doc": doc,
                "fup": fup,
                "dom": dom,
                "dob": dob,
                "status": status,
            })

    return records


def parse_lic_excel(file_path: Path) -> list[dict]:
    wb = openpyxl.load_workbook(str(file_path), data_only=True)
    sheet = wb.active
    records = []

    rows = list(sheet.iter_rows(values_only=True))
    if not rows:
        return records

    # Find header row by scanning first 15 rows for keywords
    header_idx = -1
    col_map = {}

    for idx, row in enumerate(rows[:15]):
        if not row:
            continue
        row_str = " ".join(str(c).lower() for c in row if c is not None)
        if any(k in row_str for k in ["policy", "name", "plan", "premium", "sum assured", "fup"]):
            header_idx = idx
            for c_idx, cell in enumerate(row):
                if cell is None:
                    continue
                c_clean = str(cell).strip().lower().replace("_", " ").replace(".", "")
                if "policy" in c_clean or "pol no" in c_clean or "polno" in c_clean:
                    col_map.setdefault("policy", c_idx)
                elif "name" in c_clean or "holder" in c_clean or "insured" in c_clean:
                    col_map.setdefault("name", c_idx)
                elif "plan" in c_clean or "table" in c_clean:
                    col_map.setdefault("plan", c_idx)
                elif "term" in c_clean and "ppt" not in c_clean:
                    col_map.setdefault("term", c_idx)
                elif "ppt" in c_clean:
                    col_map.setdefault("ppt", c_idx)
                elif "sum" in c_clean or " sa" in c_clean or c_clean == "sa":
                    col_map.setdefault("sa", c_idx)
                elif "prem" in c_clean or "installment" in c_clean:
                    col_map.setdefault("premium", c_idx)
                elif "mode" in c_clean:
                    col_map.setdefault("mode", c_idx)
                elif "doc" in c_clean or "commence" in c_clean or "start" in c_clean:
                    col_map.setdefault("doc", c_idx)
                elif "fup" in c_clean or "due" in c_clean or "next" in c_clean:
                    col_map.setdefault("fup", c_idx)
                elif "dom" in c_clean or "matur" in c_clean:
                    col_map.setdefault("dom", c_idx)
                elif "dob" in c_clean or "birth" in c_clean:
                    col_map.setdefault("dob", c_idx)
                elif "phone" in c_clean or "mobile" in c_clean or "contact" in c_clean:
                    col_map.setdefault("phone", c_idx)
            break

    if header_idx == -1 or "policy" not in col_map:
        # Fallback: assume first row is header
        header_idx = 0
        for c_idx, cell in enumerate(rows[0]):
            c_clean = str(cell).strip().lower()
            if "pol" in c_clean:
                col_map["policy"] = c_idx
            elif "name" in c_clean:
                col_map["name"] = c_idx

    for row in rows[header_idx + 1:]:
        if not row:
            continue

        raw_policy = row[col_map["policy"]] if "policy" in col_map and col_map["policy"] < len(row) else None
        if not raw_policy:
            continue

        policy_no = re.sub(r"\D", "", str(raw_policy))
        if not policy_no or len(policy_no) < 6:
            continue

        raw_name = row[col_map["name"]] if "name" in col_map and col_map["name"] < len(row) else "Policy Holder"
        client_name = clean_name(raw_name)

        raw_plan = str(row[col_map["plan"]]).strip() if "plan" in col_map and col_map["plan"] < len(row) and row[col_map["plan"]] else "914"
        # Extract plan/term/ppt if formatted like 914/20/15
        term = None
        ppt = None
        plan_code = raw_plan
        if "/" in raw_plan:
            parts = raw_plan.split("/")
            plan_code = parts[0].strip()
            if len(parts) > 1 and parts[1].strip().isdigit():
                term = int(parts[1].strip())
            if len(parts) > 2 and parts[2].strip().isdigit():
                ppt = int(parts[2].strip())

        if "term" in col_map and col_map["term"] < len(row) and row[col_map["term"]]:
            try:
                term = int(row[col_map["term"]])
            except (ValueError, TypeError):
                pass

        if "ppt" in col_map and col_map["ppt"] < len(row) and row[col_map["ppt"]]:
            try:
                ppt = int(row[col_map["ppt"]])
            except (ValueError, TypeError):
                pass

        sa = parse_clean_number(row[col_map["sa"]]) if "sa" in col_map and col_map["sa"] < len(row) else 0.0
        premium = parse_clean_number(row[col_map["premium"]]) if "premium" in col_map and col_map["premium"] < len(row) else 0.0
        mode = clean_mode(row[col_map["mode"]]) if "mode" in col_map and col_map["mode"] < len(row) else "Yearly"
        doc = parse_clean_date(row[col_map["doc"]]) if "doc" in col_map and col_map["doc"] < len(row) else None
        fup = parse_clean_date(row[col_map["fup"]]) if "fup" in col_map and col_map["fup"] < len(row) else None
        dom = parse_clean_date(row[col_map["dom"]]) if "dom" in col_map and col_map["dom"] < len(row) else None
        dob = parse_clean_date(row[col_map["dob"]]) if "dob" in col_map and col_map["dob"] < len(row) else None
        phone = str(row[col_map["phone"]]).strip() if "phone" in col_map and col_map["phone"] < len(row) and row[col_map["phone"]] else None

        plan_name = PLAN_NAMES.get(plan_code, f"LIC Plan {plan_code}")
        status = calculate_status(dom, fup)

        records.append({
            "policy_number": policy_no,
            "client_name": client_name,
            "plan_code": plan_code,
            "plan_name": plan_name,
            "term": term,
            "ppt": ppt,
            "sum_assured": sa,
            "premium": premium,
            "mode": mode,
            "doc": doc,
            "fup": fup,
            "dom": dom,
            "dob": dob,
            "phone": phone,
            "status": status,
        })

    return records


def ingest_agent_records(user_id: Any, records: list[dict], db: Session) -> dict:
    clients_created = 0
    policies_created = 0
    policies_updated = 0

    # Cache existing clients and policies for this agent
    existing_clients = {c.name.strip().lower(): c for c in db.query(Client).filter(Client.user_id == user_id).all()}
    existing_policies = {p.policy_number: p for p in db.query(Policy).filter(Policy.user_id == user_id).all()}

    new_clients = []
    new_policies = []

    for rec in records:
        name_key = rec["client_name"].strip().lower()
        client = existing_clients.get(name_key)

        if not client:
            client = Client(
                id=uuid.uuid4(),
                user_id=user_id,
                name=rec["client_name"],
                phone=rec.get("phone"),
                dob=rec.get("dob"),
                status="Active",
            )
            existing_clients[name_key] = client
            new_clients.append(client)
            clients_created += 1
        else:
            if rec.get("dob") and not client.dob:
                client.dob = rec["dob"]
            if rec.get("phone") and not client.phone:
                client.phone = rec["phone"]

        pol_num = rec["policy_number"]
        policy = existing_policies.get(pol_num)

        if not policy:
            policy = Policy(
                id=uuid.uuid4(),
                user_id=user_id,
                client_id=client.id,
                policy_number=pol_num,
                plan_code=rec["plan_code"],
                plan_name=rec["plan_name"],
                term=rec.get("term"),
                ppt=rec.get("ppt"),
                sum_assured=rec["sum_assured"],
                premium=rec["premium"],
                mode=rec["mode"],
                doc=rec.get("doc"),
                fup=rec.get("fup"),
                dom=rec.get("dom"),
                status=rec["status"],
            )
            existing_policies[pol_num] = policy
            new_policies.append(policy)
            policies_created += 1
        else:
            # Update policy attributes
            policy.client_id = client.id
            policy.plan_code = rec["plan_code"]
            policy.plan_name = rec["plan_name"]
            policy.sum_assured = rec["sum_assured"]
            policy.premium = rec["premium"]
            policy.mode = rec["mode"]
            if rec.get("doc"):
                policy.doc = rec["doc"]
            if rec.get("fup"):
                policy.fup = rec["fup"]
            if rec.get("dom"):
                policy.dom = rec["dom"]
            policy.status = rec["status"]
            policies_updated += 1

    if new_clients:
        db.add_all(new_clients)
    if new_policies:
        db.add_all(new_policies)

    db.commit()
    return {
        "clients_created": clients_created,
        "policies_created": policies_created,
        "policies_updated": policies_updated,
        "total_policies": len(records),
    }
