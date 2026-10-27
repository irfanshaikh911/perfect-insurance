from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import (
    create_access_token,
    decode_access_token,
    generate_refresh_token,
    hash_password,
    hash_token,
    verify_password,
)
from app.models.user import RefreshToken, User
from app.schemas.auth import RefreshTokenRequest, TokenResponse, UserLogin, UserOut, UserRegister

router = APIRouter(prefix="/auth", tags=["Authentication"])
security = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(credentials.credentials)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload["sub"]
    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(req: UserRegister, db: Session = Depends(get_db)):
    clean_agent_code = req.agent_code.strip()
    clean_email = req.email.strip().lower()

    # Check if agent_code already taken
    existing_code = db.query(User).filter(User.agent_code == clean_agent_code).first()
    if existing_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Agent code '{clean_agent_code}' is already registered.",
        )

    # Check if email already taken
    existing_email = db.query(User).filter(User.email == clean_email).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Email '{clean_email}' is already registered.",
        )

    # Create new user
    new_user = User(
        name=req.name.strip(),
        agent_code=clean_agent_code,
        branch=req.branch.strip(),
        phone=req.phone.strip(),
        email=clean_email,
        yearly_target=req.yearly_target,
        hashed_password=hash_password(req.password),
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Issue Tokens
    access_token = create_access_token(
        subject=str(new_user.id),
        extra_claims={"agent_code": new_user.agent_code, "name": new_user.name},
    )
    raw_refresh, token_hash = generate_refresh_token()

    refresh_entry = RefreshToken(
        user_id=new_user.id,
        token_hash=token_hash,
        expires_at=datetime.utcnow() + timedelta(days=settings.refresh_token_expire_days),
    )
    db.add(refresh_entry)
    db.commit()

    return TokenResponse(
        access_token=access_token,
        refresh_token=raw_refresh,
        user=UserOut(
            id=str(new_user.id),
            agent_code=new_user.agent_code,
            name=new_user.name,
            email=new_user.email,
            phone=new_user.phone,
            branch=new_user.branch,
            yearly_target=new_user.yearly_target,
            avatar=new_user.avatar,
            created_at=new_user.created_at,
        ),
    )


@router.post("/login", response_model=TokenResponse)
def login(req: UserLogin, db: Session = Depends(get_db)):
    clean_code = req.agent_code.strip()
    user = db.query(User).filter(User.agent_code == clean_code).first()

    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Agent Code or Password.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive. Please contact support.",
        )

    # Issue Tokens
    access_token = create_access_token(
        subject=str(user.id),
        extra_claims={"agent_code": user.agent_code, "name": user.name},
    )
    raw_refresh, token_hash = generate_refresh_token()

    refresh_entry = RefreshToken(
        user_id=user.id,
        token_hash=token_hash,
        expires_at=datetime.utcnow() + timedelta(days=settings.refresh_token_expire_days),
    )
    db.add(refresh_entry)
    db.commit()

    return TokenResponse(
        access_token=access_token,
        refresh_token=raw_refresh,
        user=UserOut(
            id=str(user.id),
            agent_code=user.agent_code,
            name=user.name,
            email=user.email,
            phone=user.phone,
            branch=user.branch,
            yearly_target=user.yearly_target,
            avatar=user.avatar,
            created_at=user.created_at,
        ),
    )


@router.post("/refresh", response_model=TokenResponse)
def refresh_token_endpoint(req: RefreshTokenRequest, db: Session = Depends(get_db)):
    t_hash = hash_token(req.refresh_token)
    token_record = (
        db.query(RefreshToken)
        .filter(
            RefreshToken.token_hash == t_hash,
            RefreshToken.revoked == False,
            RefreshToken.expires_at > datetime.utcnow(),
        )
        .first()
    )

    if not token_record:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    user = db.query(User).filter(User.id == token_record.user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    # Rotate Refresh Token: Revoke old, issue new
    token_record.revoked = True

    new_access_token = create_access_token(
        subject=str(user.id),
        extra_claims={"agent_code": user.agent_code, "name": user.name},
    )
    new_raw_refresh, new_token_hash = generate_refresh_token()

    new_record = RefreshToken(
        user_id=user.id,
        token_hash=new_token_hash,
        expires_at=datetime.utcnow() + timedelta(days=settings.refresh_token_expire_days),
    )
    db.add(new_record)
    db.commit()

    return TokenResponse(
        access_token=new_access_token,
        refresh_token=new_raw_refresh,
        user=UserOut(
            id=str(user.id),
            agent_code=user.agent_code,
            name=user.name,
            email=user.email,
            phone=user.phone,
            branch=user.branch,
            yearly_target=user.yearly_target,
            avatar=user.avatar,
            created_at=user.created_at,
        ),
    )


@router.post("/logout")
def logout(req: RefreshTokenRequest, db: Session = Depends(get_db)):
    t_hash = hash_token(req.refresh_token)
    token_record = db.query(RefreshToken).filter(RefreshToken.token_hash == t_hash).first()
    if token_record:
        token_record.revoked = True
        db.commit()
    return {"message": "Successfully logged out"}


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return UserOut(
        id=str(current_user.id),
        agent_code=current_user.agent_code,
        name=current_user.name,
        email=current_user.email,
        phone=current_user.phone,
        branch=current_user.branch,
        yearly_target=current_user.yearly_target,
        avatar=current_user.avatar,
        created_at=current_user.created_at,
    )
