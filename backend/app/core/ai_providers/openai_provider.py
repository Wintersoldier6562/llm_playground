from typing import Dict, Any
import tiktoken
from openai import AsyncOpenAI
from .base import BaseAIProvider, ModelResponse, TokenUsage
from typing import AsyncGenerator
import time
from datetime import datetime, timezone
class OpenAIProvider(BaseAIProvider):
    def __init__(self, api_key: str):
        super().__init__(api_key)
        self.client = AsyncOpenAI(api_key=api_key)
        self.model = "gpt-4o"
        self.encoding = tiktoken.encoding_for_model(self.model)
    
    @property
    def provider_name(self) -> str:
        return "openai"
    
    async def generate_response(self, prompt: str, **kwargs) -> ModelResponse:
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                **kwargs
            )
            
            usage = self._create_token_usage(
                prompt_tokens=response.usage.prompt_tokens,
                completion_tokens=response.usage.completion_tokens
            )
            
            return ModelResponse(
                content=response.choices[0].message.content,
                model=self.model,
                usage=usage,
            )
        except Exception as e:
            raise Exception(f"OpenAI API error: {str(e)}")
    
    async def stream_response(self, prompt: str) -> AsyncGenerator[str, None]:
        try:
            start_time = time.time()
            stream = await self.client.chat.completions.create(
                model="gpt-4",
                messages=[{"role": "user", "content": prompt}],
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
                "model_name": self.provider_name,
                'prompt_tokens': chunk.usage.prompt_tokens,
                'completion_tokens': chunk.usage.completion_tokens,
                'total_tokens': chunk.usage.prompt_tokens + chunk.usage.completion_tokens,
                "cost": self.calculate_cost(usage),
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
        except Exception as e:
            yield f"Error: {str(e)}"

    def count_tokens(self, text: str) -> int:
        return len(self.encoding.encode(text)) 