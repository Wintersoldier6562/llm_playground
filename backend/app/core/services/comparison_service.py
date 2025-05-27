import asyncio
import time
import json
import redis
import httpx
from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.ai_providers.base import BaseAIProvider
from app.core.ai_providers.openai_provider import OpenAIProvider
from app.core.ai_providers.anthropic_provider import AnthropicProvider
from app.core.ai_providers.xai_provider import XAIProvider
from app.core.ai_providers.gemini_provider import GeminiProvider
from app.core.database.models import Prompt, ModelResponse, User
from app.core.schemas.comparison import  ComparisonCreateRequest, ComparisonResponse, ModelResponse as ModelResponseSchema, ModelConfig, ProviderModels
from app.core.config import settings
from datetime import datetime, timezone
from typing import AsyncGenerator
from sqlalchemy import select
from collections import defaultdict

class ComparisonService:
    def __init__(self):
        self.providers: Dict[str, BaseAIProvider] = {
            "openai": OpenAIProvider(settings.OPENAI_API_KEY),
            "anthropic": AnthropicProvider(settings.ANTHROPIC_API_KEY),
            "xai": XAIProvider(settings.XAI_API_KEY),
            "google": GeminiProvider(settings.GEMINI_API_KEY),
        }
        self.default_provider_models: Dict[str, str] = {
            "openai": "gpt-4o",
            "anthropic": "claude-3-opus-20240229",
            "xai": "grok-3-beta",
            "google": "gemini-1.5-pro",
        }
        # Initialize Redis client
        self.redis_client = redis.Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            db=settings.REDIS_DB,
            decode_responses=True
        )
    
    async def get_models(self) -> List[ProviderModels]:
        """
        Get all supported models from each AI provider.
        Returns a list of ProviderModels containing model configurations.
        Cached in Redis for 24 hours.
        """
        # Try to get cached data
        cached_models = self.redis_client.get("provider_models_details")
        if cached_models:
            return [ProviderModels(**provider_data) for provider_data in json.loads(cached_models)]
        
        # Fetch models from litellm
        async with httpx.AsyncClient() as client:
            response = await client.get("https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json")
            models = response.json()
            
            # Filter and process models
            filtered_models = defaultdict(list)
            for model_name, model_data in models.items():
                
                if not all(key in model_data for key in ["litellm_provider", "mode"]):
                    continue
                    
                provider = model_data["litellm_provider"]
                if provider == "vertex_ai-language-models":
                    provider = "google"
                if provider not in self.providers.keys() or model_data["mode"] != "chat":
                    continue
                
                if 'audio' in model_name or 'vision' in model_name or "ft:" in model_name:
                    continue
                # Clean model name
                clean_model_name = model_name.replace("xai/", "") if 'xai/' in model_name else model_name
                model_data["model_name"] = clean_model_name
                filtered_models[provider].append(model_data)

            # Get supported models from each provider
            provider_models = []
            for provider_name, models in filtered_models.items():
                model_configs = []
                provider = self.providers[provider_name]
                supported_models = await provider.get_supported_models(models)
                for model in supported_models:
                    try:
                        model_config = ModelConfig(
                            model_name=model["model_name"],
                            max_tokens=model["max_tokens"],
                            input_cost_per_token=model["input_cost_per_token"],
                            output_cost_per_token=model["output_cost_per_token"],
                            mode=model["mode"],
                            provider=provider_name
                        )
                        model_configs.append(model_config)
                    except Exception as e:
                        print(f"Error creating model config: {e} {model}")
                
                if len(model_configs) > 0:
                        provider_models.append(ProviderModels(
                            provider=provider_name,
                            models=model_configs
                        ))

            # Cache the results
            cache_data = [provider_model.model_dump() for provider_model in provider_models]
            self.redis_client.setex(
                "provider_models_details",
                24 * 60 * 60,  # 24 hours in seconds
                json.dumps(cache_data)
            )
            
            return provider_models
    
    async def _get_model_response_stream(
        self, prompt_id: str, provider_name:str, model_name: str, prompt: str, max_tokens: int
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Get streaming response from a specific model.
        """
        if provider_name not in self.providers:
            raise ValueError(f"Invalid provider: {provider_name}")
        
        provider = self.providers[provider_name]
        provider_model_configs = await self.get_models()
        pricing = None
        model_config = None
        for config in provider_model_configs:
            models = config.models
            for model in models:
                if model.model_name == model_name:
                    model_config = model
                    pricing = {
                        "input_cost_per_token": model.input_cost_per_token,
                        "output_cost_per_token": model.output_cost_per_token
                    }
                    break
        
        if pricing is None or model_config is None:
            raise ValueError(f"ModelConfig for {model_name} not found for provider {provider_name}")

        print(f"Streaming response from {provider_name} {model_name} {provider}")
        
        try:
            async for chunk in provider.stream_response(prompt, max_tokens, model_name, pricing):
                print(f"chunk: {chunk}", flush=True)
                if isinstance(chunk, dict):
                    print(f"chunk is dict: {chunk}", flush=True)
                    chunk['is_final'] = True
                    yield chunk
                else:
                    if "Exception Occured: " in chunk:
                        exception_message = chunk.split("Exception Occured: ")[1]
                        raise Exception(exception_message)
                    else:
                        yield {
                            "provider_name": provider_name,
                            "model_name": model_name,
                            "content": chunk,
                            "is_final": False
                        }
            
        except Exception as e:
            yield {
                "provider_name": provider_name,
                "model_name": model_name,
                "error": str(e),
                "is_final": True
            }
    
    async def get_prompt_responses(
        self, db: AsyncSession, prompt_id: str
    ) -> List[ModelResponseSchema]:
        """
        Get all model responses for a specific prompt.
        """
        # Query the database for all model responses for this prompt
        query = select(ModelResponse).where(ModelResponse.prompt_id == prompt_id)
        result = await db.execute(query)
        responses = result.scalars().all()
        
        # Convert to schema objects
        return [
            ModelResponseSchema(
                model_name=response.model_name,
                content=response.content,
                usage=response.usage,
                cost=response.cost,
                latency=response.latency,
                created_at=response.created_at
            )
            for response in responses
        ]
    
    async def create_comparison(
        self,
        db: AsyncSession,
        request: ComparisonCreateRequest,
        user: User
    ) -> ComparisonResponse:
        """
        Create a new comparison with prompt and model responses.
        """
        # Create prompt
        prompt = Prompt(
            id=request.prompt_id,
            content=request.prompt,
            user_id=user.id,
            created_at=request.created_at
        )
        db.add(prompt)
        await db.flush()

        # Create model responses
        for response in request.responses:
            model_response = ModelResponse(
                prompt_id=prompt.id,
                model_name=response.model_name,
                content=response.content,
                prompt_tokens=response.usage.prompt_tokens,
                completion_tokens=response.usage.completion_tokens,
                total_tokens=response.usage.total_tokens,
                cost=response.cost,
                latency=response.latency,
                created_at=response.created_at,
            )
            db.add(model_response)

        await db.commit()
        await db.refresh(prompt)

        # convert request to ComparisonResponse
        return ComparisonResponse(**request.model_dump()) 