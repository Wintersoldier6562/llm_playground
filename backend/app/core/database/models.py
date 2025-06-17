from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON, text, UUID, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.core.database.base_class import Base
import enum
class SessionType(enum.Enum):
    CONVERSATION = "conversation"
    FIXED_CONTEXT = "fixed_context"

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
    chat_sessions = relationship("ChatSession", back_populates="user", cascade="all, delete-orphan")

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

class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID, ForeignKey("users.id"), nullable=False)
    provider = Column(String, nullable=False)  # e.g., "openai", "anthropic"
    model = Column(String, nullable=False)     # e.g., "gpt-4", "claude-3-opus"
    title = Column(String, nullable=True)      # Optional session title
    is_active = Column(Boolean, default=True)
    session_type = Column(String, nullable=False, server_default=SessionType.CONVERSATION.value, 
                         info={'choices': [session_type.value for session_type in SessionType]})
    context = Column(String, nullable=True, default="", server_default="", server_length=1000000)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="chat_sessions")
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan")

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID, ForeignKey("chat_sessions.id"), nullable=False)
    role = Column(String, nullable=False)  # e.g., "user", "assistant", "system"
    content = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Token usage and metrics
    prompt_tokens = Column(Integer, nullable=True)
    completion_tokens = Column(Integer, nullable=True)
    total_tokens = Column(Integer, nullable=True)
    cost = Column(Float, nullable=True)
    latency = Column(Float, nullable=True)  # Response time in seconds

    # Relationships
    session = relationship("ChatSession", back_populates="messages") 