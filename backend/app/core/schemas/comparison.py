from typing import List, Optional, Dict
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
    provider_models: Optional[Dict[str, str]] = None
    max_tokens: int

class ComparisonCreateRequest(BaseModel):
    prompt_id: UUID
    prompt: str
    responses: List[ModelResponse]
    created_at: datetime

class ModelConfig(BaseModel):
    model_name: str
    max_tokens: int
    input_cost_per_token: float
    output_cost_per_token: float
    mode: str
    provider: str

# create a schema for the final models, grouped by provider(provider is the key) and List of ModelConfig is the value
class ProviderModels(BaseModel):
    provider: str
    models: List[ModelConfig]
