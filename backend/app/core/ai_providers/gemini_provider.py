from typing import List, Dict, AsyncGenerator
import google.generativeai as genai
from .base import BaseAIProvider, ModelResponse
import time
from datetime import datetime, timezone

class GeminiProvider(BaseAIProvider):
    def __init__(self, api_key: str):
        super().__init__(api_key)
        genai.configure(api_key=api_key)
        self.client = genai
    
    @property
    def provider_name(self) -> str:
        return "google"
    
    async def get_supported_models(self, models: List[Dict]) -> List[Dict]:
        """Get list of supported models from Gemini API."""
        try:
            # Filter and sort Gemini models
            # sort models by model_name descending and include grok- models first and then exclude grok-beta model
            required_models = [
                "gemini-1.0-pro",
                "gemini-1.0-ultra",
                "gemini-1.5-flash",
                "gemini-1.5-pro",
                "gemini-2.0-flash",
            ]
            models = [model for model in models if model["model_name"] in required_models]
            models.sort(key=lambda x: x["model_name"], reverse=True)
            return models
        except Exception as e:
            # Fallback to known models if API call fails
            return [
                "gemini-pro",
                "gemini-pro-vision"
            ]
    
    async def stream_response(self, messages: List[Dict[str, str]], max_tokens: int, model: str, pricing: Dict[str, float]) -> AsyncGenerator[str, None]:
        try:
            start_time = time.time()
            prompt_tokens = 0
            completion_tokens = 0
            # Initialize the model
            model_instance = self.client.GenerativeModel(model)
            # Convert the messages to the correct format
            formatted_messages = []
            for message in messages:
                role = "model" if message["role"] == "system" else "user"
                formatted_messages.append({"role": role, "parts": [message["content"]]})

            # Generate content with streaming
            response = await model_instance.generate_content_async(
                formatted_messages,
                generation_config={
                    "max_output_tokens": max_tokens,
                },
                stream=True
            )
            
            # Stream the response
            async for chunk in response:
                if chunk.usage_metadata.candidates_token_count is not None:
                    completion_tokens += chunk.usage_metadata.candidates_token_count
                    prompt_tokens += chunk.usage_metadata.prompt_token_count
                if chunk.text:
                    yield chunk.text
            
            end_time = time.time()

            usage = self._create_token_usage(
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens
            )
            
            yield {
                "is_final": True,
                "content": '',
                "latency": end_time - start_time,
                "provider_name": self.provider_name,
                "model_name": model,
                'prompt_tokens': prompt_tokens,
                'completion_tokens': completion_tokens,
                'total_tokens': prompt_tokens + completion_tokens,
                "cost": self.calculate_cost(usage, pricing),
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
        except Exception as e:
            yield f"Exception Occurred: {str(e)}" 