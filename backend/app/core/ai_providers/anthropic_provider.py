from typing import Dict, Any
import anthropic
from .base import BaseAIProvider, ModelResponse, TokenUsage
from typing import AsyncGenerator
import time
from datetime import datetime, timezone
class AnthropicProvider(BaseAIProvider):
    def __init__(self, api_key: str):
        super().__init__(api_key)
        self.client = anthropic.AsyncAnthropic(api_key=api_key)
        self.model = "claude-3-7-sonnet-20250219"
    
    @property
    def provider_name(self) -> str:
        return "anthropic"
    
    async def generate_response(self, prompt: str, **kwargs) -> ModelResponse:
        try:
            response = await self.client.messages.create(
                model=self.model,
                max_tokens=4096,
                messages=[{"role": "user", "content": prompt}],
                **kwargs
            )
            usage = self._create_token_usage(
                prompt_tokens=response.usage.input_tokens,
                completion_tokens=response.usage.output_tokens
            )
            
            return ModelResponse(
                content=response.content[0].text,
                model=self.model,
                usage=usage,
            )
        except Exception as e:
            raise Exception(f"Anthropic API error: {str(e)}")
    
    async def stream_response(self, prompt: str) -> AsyncGenerator[str, None]:
        try:
            start_time = time.time()
            input_tokens = 0
            output_tokens = 0
            stream = await self.client.messages.create(
                model="claude-3-opus-20240229",
                max_tokens=1000,
                messages=[{"role": "user", "content": prompt}],
                stream=True
            )
            async for chunk in stream:
                if chunk.type == 'message_delta':
                    usage = chunk.usage
                    input_tokens += (usage.input_tokens or 0)
                    output_tokens += (usage.output_tokens or 0)

                if chunk.type == 'message_start':
                    usage = chunk.message.usage
                    input_tokens += (usage.input_tokens or 0)
                    output_tokens += (usage.output_tokens or 0)
                if chunk.type == "content_block_delta":
                    yield chunk.delta.text
            
            # finally send the full response with metrics
            end_time = time.time()
            usage = self._create_token_usage(
                prompt_tokens=input_tokens,
                completion_tokens=output_tokens
            )
            yield {
                "is_final": True,
                "content": '',
                "latency": end_time - start_time,
                "model_name": self.provider_name,
                'prompt_tokens': input_tokens,
                'completion_tokens': output_tokens,
                'total_tokens': input_tokens + output_tokens,
                "cost": self.calculate_cost(usage),
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
        except Exception as e:
            yield f"Error: {str(e)}"
    
    def count_tokens(self, text: str) -> int:
        # Anthropic provides token counting through their API
        # For simplicity, we'll use a rough estimation
        # In production, you might want to use their actual tokenizer
        return len(text.split()) * 1.3  # Rough estimation 