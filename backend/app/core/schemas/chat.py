from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime
from uuid import UUID
from app.core.database.models import SessionType
class ChatSessionCreate(BaseModel):
    provider: str = Field(..., description="LLM provider (e.g., openai, anthropic)")
    model: str = Field(..., description="Model name (e.g., gpt-4, claude-3-opus)")
    title: Optional[str] = Field(None, description="Optional session title")
    session_type: Optional[SessionType] = Field(SessionType.CONVERSATION.value, description="Session type")
    context: Optional[str] = Field(None, description="Context for fixed context sessions")

class ChatSessionUpdate(BaseModel):
    title: Optional[str] = Field(None, description="New session title")
    is_active: Optional[bool] = Field(None, description="Session active status")

class ChatSessionInDB(ChatSessionCreate):
    id: UUID
    user_id: UUID
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ChatMessage(BaseModel):
    role: str = Field(..., description="Message role (user, assistant, system)")
    content: str = Field(..., description="Message content")

class ChatSessionResponse(ChatSessionInDB):
    messages: Optional[List[ChatMessage]] = Field(None, description="Current session messages")

class ChatSessionList(BaseModel):
    sessions: List[ChatSessionInDB]
    total: int

class ChatMessageRequest(BaseModel):
    content: str = Field(..., description="Message content")
    role: str = Field("user", description="Message role (user, assistant, system)")

class ChatMessageResponse(BaseModel):
    id: UUID
    role: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True

class ChatCompletionRequest(BaseModel):
    message: str = Field(..., description="User message to send to the model")
    provider: str = Field(..., description="LLM provider (e.g., openai, anthropic)")
    model: str = Field(..., description="Model name (e.g., gpt-4, claude-3-opus)")
    stream: bool = Field(False, description="Whether to stream the response")
    temperature: Optional[float] = Field(0.7, description="Sampling temperature (0-2)")
    max_tokens: Optional[int] = Field(None, description="Maximum tokens to generate")
    system_message: Optional[str] = Field(None, description="Optional system message to set context")

class ChatCompletionResponse(BaseModel):
    message: ChatMessageResponse
    usage: Optional[Dict[str, int]] = Field(None, description="Token usage information")
    latency: Optional[float] = Field(None, description="Response latency in seconds")

class ChatCompletionChunk(BaseModel):
    content: str
    is_final: bool = False
    usage: Optional[Dict[str, int]] = None
    latency: Optional[float] = None

class ChatWebSocketMessage(BaseModel):
    type: str = Field(..., description="Message type (chat, ping)")
    content: Optional[str] = Field(None, description="Message content for chat messages")

class ChatWebSocketResponse(BaseModel):
    type: str = Field(..., description="Response type (connection_established, message_received, chunk, error, pong)")
    content: Optional[Any] = Field(None, description="Response content")
    session: Optional[Dict[str, Any]] = Field(None, description="Session information for connection_established")
    timestamp: Optional[float] = Field(None, description="Timestamp for pong messages") 