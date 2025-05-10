from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON, text, UUID, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.core.database.base_class import Base

class User(Base):
    __tablename__ = "users"

    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    prompts = relationship("Prompt", back_populates="user")

class Prompt(Base):
    __tablename__ = "prompts"
    
    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    content = Column(String, nullable=False)
    user_id = Column(UUID, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    responses = relationship("ModelResponse", back_populates="prompt", cascade="all, delete-orphan")

    # Relationships
    user = relationship("User", back_populates="prompts")

class ModelResponse(Base):
    __tablename__ = "model_responses"
    
    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    prompt_id = Column(UUID, ForeignKey("prompts.id"), nullable=False)
    model_name = Column(String, nullable=False)
    content = Column(String, nullable=False)
    prompt_tokens = Column(Integer, nullable=False)
    completion_tokens = Column(Integer, nullable=False)
    total_tokens = Column(Integer, nullable=False)
    cost = Column(Float, nullable=False)
    latency = Column(Float, nullable=False)  # Response time in seconds
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    prompt = relationship("Prompt", back_populates="responses") 