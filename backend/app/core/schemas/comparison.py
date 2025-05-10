from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from uuid import UUID

class TokenUsage(BaseModel):
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int

class ModelResponse(BaseModel):
    model_name: str
    content: str
    usage: TokenUsage
    cost: float
    latency: float
    created_at: datetime

class ComparisonResponse(BaseModel):
    prompt_id: UUID
    prompt: str
    responses: List[ModelResponse]
    created_at: datetime

class ComparisonRequest(BaseModel):
    prompt: str
    models: Optional[List[str]] = None

class ComparisonCreateRequest(BaseModel):
    prompt_id: UUID
    prompt: str
    responses: List[ModelResponse]
    created_at: datetime
