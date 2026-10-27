import shutil
import uuid
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.routes.auth import get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.models.client_policy import AgentUpload, Client, Policy
from app.models.user import User
from app.services.parser import ingest_agent_records, parse_lic_excel, parse_lic_pdf

router = APIRouter(prefix="/agent", tags=["Agent Data"])


class UploadResponse(BaseModel):
    success: bool
    filename: str
    clients_created: int
    policies_created: int
    policies_updated: int
    total_policies: int
    message: str


class ClientOut(BaseModel):
    id: str
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    dob: Optional[str] = None
    address: Optional[str] = None
    status: str
    policy_count: int = 0
    total_premium: float = 0.0

    class Config:
        from_attributes = True


class PolicyOut(BaseModel):
    id: str
    client_id: str
    client_name: str
    policy_number: str
    plan_code: str
    plan_name: str
    term: Optional[int] = None
    ppt: Optional[int] = None
    sum_assured: float
    premium: float
    mode: str
    doc: Optional[str] = None
    fup: Optional[str] = None
    dom: Optional[str] = None
    status: str

    class Config:
        from_attributes = True


class UploadHistoryItem(BaseModel):
    id: str
    filename: str
    file_type: str
    file_size: int
    records_count: int
    status: str
    created_at: str

    class Config:
        from_attributes = True


class AgentSummary(BaseModel):
    total_clients: int
    total_policies: int
    active_policies: int
    lapsed_policies: int
    dues_this_week: int
    due_amount_this_week: float


@router.post("/upload", response_model=UploadResponse)
async def upload_policy_book(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    filename = file.filename or "policy_book"
    ext = Path(filename).suffix.lower()

    if ext not in [".xlsx", ".xls", ".pdf"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file format. Please upload an Excel (.xlsx, .xls) or PDF file.",
        )

    # Prepare server storage path: backend/storage/agents/{agent_id}/uploads/
    agent_storage = settings.storage_dir / "agents" / str(current_user.id) / "uploads"
    agent_storage.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    safe_name = f"{timestamp}_{re_safe(filename)}"
    destination_path = agent_storage / safe_name

    # Save physical file to disk
    try:
        with destination_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to store file on server: {str(e)}",
        )
    finally:
        file.file.close()

    file_size = destination_path.stat().st_size
    file_type = "excel" if ext in [".xlsx", ".xls"] else "pdf"

    # Create upload record
    upload_rec = AgentUpload(
        user_id=current_user.id,
        filename=filename,
        file_path=str(destination_path),
        file_type=file_type,
        file_size=file_size,
        status="processing",
    )
    db.add(upload_rec)
    db.commit()

    # Parse and ingest
    try:
        if file_type == "excel":
            records = parse_lic_excel(destination_path)
        else:
            records = parse_lic_pdf(destination_path)

        if not records:
            upload_rec.status = "failed"
            upload_rec.error_message = "No valid policy rows found in file."
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Could not detect policy records in the uploaded file. Please ensure it is a valid LIC policy register or spreadsheet.",
            )

        stats = ingest_agent_records(current_user.id, records, db)

        upload_rec.status = "completed"
        upload_rec.records_count = len(records)
        db.commit()

        return UploadResponse(
            success=True,
            filename=filename,
            clients_created=stats["clients_created"],
            policies_created=stats["policies_created"],
            policies_updated=stats["policies_updated"],
            total_policies=stats["total_policies"],
            message=f"Successfully imported {stats['total_policies']} policies ({stats['clients_created']} new clients created, {stats['policies_created']} new policies added).",
        )

    except HTTPException:
        raise
    except Exception as e:
        upload_rec.status = "failed"
        upload_rec.error_message = str(e)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error parsing policy file: {str(e)}",
        )


@router.get("/uploads", response_model=List[UploadHistoryItem])
def get_upload_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    history = (
        db.query(AgentUpload)
        .filter(AgentUpload.user_id == current_user.id)
        .order_by(AgentUpload.created_at.desc())
        .limit(20)
        .all()
    )

    return [
        UploadHistoryItem(
            id=str(h.id),
            filename=h.filename,
            file_type=h.file_type,
            file_size=h.file_size,
            records_count=h.records_count,
            status=h.status,
            created_at=h.created_at.isoformat(),
        )
        for h in history
    ]


@router.get("/clients", response_model=List[ClientOut])
def get_agent_clients(
    q: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Client).filter(Client.user_id == current_user.id)

    if q and q.strip():
        term = f"%{q.strip().lower()}%"
        query = query.filter(func.lower(Client.name).like(term) | Client.phone.like(term))

    clients = query.order_by(Client.name.asc()).all()

    # Pre-calculate counts and premiums in memory with 1 query
    all_policies = db.query(Policy.client_id, Policy.premium).filter(Policy.user_id == current_user.id).all()
    pols_map = {}
    for p_client_id, p_prem in all_policies:
        if p_client_id not in pols_map:
            pols_map[p_client_id] = {"count": 0, "total": 0.0}
        pols_map[p_client_id]["count"] += 1
        pols_map[p_client_id]["total"] += float(p_prem or 0.0)

    results = []
    for c in clients:
        c_stats = pols_map.get(c.id, {"count": 0, "total": 0.0})
        results.append(
            ClientOut(
                id=str(c.id),
                name=c.name,
                phone=c.phone,
                email=c.email,
                dob=c.dob.isoformat() if c.dob else None,
                address=c.address,
                status=c.status,
                policy_count=c_stats["count"],
                total_premium=c_stats["total"],
            )
        )

    return results


@router.get("/policies", response_model=List[PolicyOut])
def get_agent_policies(
    status_filter: Optional[str] = Query(None, alias="status"),
    mode_filter: Optional[str] = Query(None, alias="mode"),
    q: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Policy).filter(Policy.user_id == current_user.id)

    if status_filter and status_filter != "All":
        query = query.filter(Policy.status == status_filter)

    if mode_filter and mode_filter != "All":
        query = query.filter(Policy.mode == mode_filter)

    policies = query.order_by(Policy.fup.asc().nullslast()).all()

    # Join client names
    clients_map = {c.id: c.name for c in db.query(Client).filter(Client.user_id == current_user.id).all()}

    results = []
    for p in policies:
        c_name = clients_map.get(p.client_id, "Unknown Client")
        if q and q.strip():
            term = q.strip().lower()
            if term not in c_name.lower() and term not in p.policy_number.lower() and term not in p.plan_name.lower():
                continue

        results.append(
            PolicyOut(
                id=str(p.id),
                client_id=str(p.client_id),
                client_name=c_name,
                policy_number=p.policy_number,
                plan_code=p.plan_code,
                plan_name=p.plan_name,
                term=p.term,
                ppt=p.ppt,
                sum_assured=p.sum_assured,
                premium=p.premium,
                mode=p.mode,
                doc=p.doc.isoformat() if p.doc else None,
                fup=p.fup.isoformat() if p.fup else None,
                dom=p.dom.isoformat() if p.dom else None,
                status=p.status,
            )
        )

    return results


@router.get("/summary", response_model=AgentSummary)
def get_agent_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    today = date.today()
    in_7_days = today + timedelta(days=7)

    total_clients = db.query(Client).filter(Client.user_id == current_user.id).count()
    policies = db.query(Policy).filter(Policy.user_id == current_user.id).all()

    total_policies = len(policies)
    active_policies = sum(1 for p in policies if p.status == "Active")
    lapsed_policies = sum(1 for p in policies if p.status == "Lapsed")

    due_policies = [p for p in policies if p.status == "Active" and p.fup and today <= p.fup <= in_7_days]
    dues_count = len(due_policies)
    due_amount = sum(p.premium for p in due_policies)

    return AgentSummary(
        total_clients=total_clients,
        total_policies=total_policies,
        active_policies=active_policies,
        lapsed_policies=lapsed_policies,
        dues_this_week=dues_count,
        due_amount_this_week=due_amount,
    )


def re_safe(name: str) -> str:
    import re
    return re.sub(r"[^a-zA-Z0-9_.-]", "_", name)
