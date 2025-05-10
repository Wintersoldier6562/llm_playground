from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from pydantic import BaseModel
from app.core.services.pricing_service import PricingService

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
        self.pricing_service = PricingService()
    
    @abstractmethod
    async def generate_response(self, prompt: str, **kwargs) -> ModelResponse:
        """Generate a response from the AI model."""
        pass
    
    def calculate_cost(self, usage: TokenUsage) -> float:
        """Calculate the cost of the API call based on token usage."""
        pricing = self.pricing_service.get_pricing(self.provider_name)
        prompt_cost = (usage.prompt_tokens / 1000) * pricing["prompt_price_per_1k"]
        completion_cost = (usage.completion_tokens / 1000) * pricing["completion_price_per_1k"]
        return prompt_cost + completion_cost
    
    @abstractmethod
    def count_tokens(self, text: str) -> int:
        """Count the number of tokens in the given text."""
        pass
    
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