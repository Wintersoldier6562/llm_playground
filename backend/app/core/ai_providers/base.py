from abc import ABC, abstractmethod
from typing import Dict, List, AsyncGenerator
from pydantic import BaseModel

class TokenUsage(BaseModel):
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int

class ModelResponse(BaseModel):
    content: str
    model: str
    usage: TokenUsage

class BaseAIProvider(ABC):
    def __init__(self, api_key: str):
        self.api_key = api_key
    
    @abstractmethod
    async def get_supported_models(self) -> List[str]:
        """Get list of supported models from the provider."""
        pass
    
    @abstractmethod
    async def stream_response(self, messages: List[Dict[str, str]], max_tokens: int, model: str, pricing: Dict[str, float]) -> AsyncGenerator[str, None]:
        """Stream the response from the provider."""
        pass

    def calculate_cost(self, usage: TokenUsage, pricing: Dict[str, float]) -> float:
        """Calculate the cost of the API call based on token usage."""
        prompt_cost = (usage.prompt_tokens) * pricing["input_cost_per_token"]
        completion_cost = (usage.completion_tokens) * pricing["output_cost_per_token"]
        return prompt_cost + completion_cost
    
    
    def _create_token_usage(self, prompt_tokens: int, completion_tokens: int) -> TokenUsage:
        """Create a TokenUsage object with the given token counts."""
        return TokenUsage(
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=prompt_tokens + completion_tokens
        )
    
    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Return the name of the provider."""
        pass 