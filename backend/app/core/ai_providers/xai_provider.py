from typing import List, Dict
from openai import AsyncOpenAI
from .base import BaseAIProvider, ModelResponse, TokenUsage
from typing import AsyncGenerator
import time
from datetime import datetime, timezone

class XAIProvider(BaseAIProvider):
    def __init__(self, api_key: str):
        super().__init__(api_key)
        self.client = AsyncOpenAI(api_key=api_key, base_url="https://api.x.ai/v1")
    
    @property
    def provider_name(self) -> str:
        return "xai"
    
    async def get_supported_models(self) -> List[str]:
        """Get list of supported models from XAI API."""
        try:
            models = await self.client.models.list()
            # Filter for Grok models
            grok_models = [
                model.id for model in models.data 
                if model.id.startswith("grok-")
            ]
            return sorted(grok_models)
        except Exception as e:
            # Fallback to known models if API call fails
            return ["grok-3-beta"]
    
    async def stream_response(self, prompt: str, max_tokens: int, model: str, pricing: Dict[str, float]) -> AsyncGenerator[str, None]:
        try:
            start_time = time.time()
            stream = await self.client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=max_tokens,
                stream=True,
                stream_options={
                    "include_usage": True
                }
            )
            async for chunk in stream:
                if chunk.choices and len(chunk.choices) > 0 and chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
            
            end_time = time.time()
            usage = self._create_token_usage(
                prompt_tokens=chunk.usage.prompt_tokens,
                completion_tokens=chunk.usage.completion_tokens
            )
            yield {
                "is_final": True,
                "content": '',
                "latency": end_time - start_time,
                "provider_name": self.provider_name,
                "model_name": model,
                'prompt_tokens': chunk.usage.prompt_tokens,
                'completion_tokens': chunk.usage.completion_tokens,
                'total_tokens': chunk.usage.prompt_tokens + chunk.usage.completion_tokens,
                "cost": self.calculate_cost(usage, pricing),
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
        except Exception as e:
            yield f"Exception Occured: {str(e)}"
