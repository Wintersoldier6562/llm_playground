from typing import Dict, Any, List
import anthropic
from .base import BaseAIProvider, ModelResponse, TokenUsage
from typing import AsyncGenerator
import time
from datetime import datetime, timezone

class AnthropicProvider(BaseAIProvider):
    def __init__(self, api_key: str):
        super().__init__(api_key)
        self.client = anthropic.AsyncAnthropic(api_key=api_key)
    
    @property
    def provider_name(self) -> str:
        return "anthropic"
    
    async def get_supported_models(self, models: List[Dict]) -> List[Dict]:
        """Get list of supported models from Anthropic API."""
        try:
            required_models = [
                "claude-3-5-haiku-latest",
                "claude-3-5-sonnet-latest",
                "claude-3-7-sonnet-latest",
                "claude-3-opus-latest",
                "claude-3-haiku-latest",
                "claude-3-sonnet-latest",
                "claude-3-7-haiku-latest"
            ]
            models = [model for model in models if model["model_name"] in required_models]
            models.sort(key=lambda x: x["model_name"], reverse=True)
            return models
        except Exception as e:
            # Fallback to known models if API call fails
            print(f"Error getting supported models: {e}")
            return [
                "claude-3-opus-20240229",
                "claude-3-sonnet-20240229",
                "claude-3-haiku-20240307"
            ]

    async def stream_response(self, messages: List[Dict[str, str]], max_tokens: int, model: str, pricing: Dict[str, float]) -> AsyncGenerator[str, None]:
        try:
            start_time = time.time()
            input_tokens = 0
            output_tokens = 0

            formatted_messages = []
            for message in messages:
                role = "assistant" if message["role"] == "system" else "user"
                formatted_messages.append({"role": role, "content": message["content"]})

            stream = await self.client.messages.create(
                model=model,
                max_tokens=max_tokens,
                messages=formatted_messages,
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
                "provider_name": self.provider_name,
                "model_name": model,
                'prompt_tokens': input_tokens,
                'completion_tokens': output_tokens,
                'total_tokens': input_tokens + output_tokens,
                "cost": self.calculate_cost(usage, pricing),
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
        except Exception as e:
            yield f"Exception Occured: {str(e)}"
