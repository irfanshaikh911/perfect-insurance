import uuid
from datetime import datetime
from sqlalchemy import Column, Date, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.user import GUID


class Client(Base):
    __tablename__ = "clients"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False, index=True)
    phone = Column(String(50), nullable=True, index=True)
    email = Column(String(255), nullable=True)
    dob = Column(Date, nullable=True)
    address = Column(Text, nullable=True)
    status = Column(String(50), default="Active", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = relationship("User")
    policies = relationship("Policy", back_populates="client", cascade="all, delete-orphan")


class Policy(Base):
    __tablename__ = "policies"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    client_id = Column(GUID(), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True)
    policy_number = Column(String(50), nullable=False, index=True)
    plan_code = Column(String(20), nullable=False)
    plan_name = Column(String(255), nullable=False)
    term = Column(Integer, nullable=True)
    ppt = Column(Integer, nullable=True)
    sum_assured = Column(Float, default=0.0, nullable=False)
    premium = Column(Float, default=0.0, nullable=False)
    mode = Column(String(50), default="Yearly", nullable=False)
    doc = Column(Date, nullable=True)
    fup = Column(Date, nullable=True, index=True)
    dom = Column(Date, nullable=True)
    status = Column(String(50), default="Active", index=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = relationship("User")
    client = relationship("Client", back_populates="policies")


class AgentUpload(Base):
    __tablename__ = "agent_uploads"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_type = Column(String(50), nullable=False)
    file_size = Column(Integer, nullable=False)
    records_count = Column(Integer, default=0, nullable=False)
    status = Column(String(50), default="completed", nullable=False)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User")
