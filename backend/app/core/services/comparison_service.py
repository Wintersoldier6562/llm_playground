import asyncio
import time
from typing import List, Dict, Optional, Any
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.ai_providers.base import BaseAIProvider
from app.core.ai_providers.openai_provider import OpenAIProvider
from app.core.ai_providers.anthropic_provider import AnthropicProvider
from app.core.ai_providers.xai_provider import XAIProvider
from app.core.database.models import Prompt, ModelResponse, User
from app.core.schemas.comparison import ComparisonRequest, ComparisonCreateRequest, ComparisonResponse, ModelResponse as ModelResponseSchema, TokenUsage
from app.core.config import settings
from uuid import UUID, uuid4
from datetime import datetime, timezone
from typing import AsyncGenerator
from sqlalchemy import select

class ComparisonService:
    def __init__(self):
        self.providers: Dict[str, BaseAIProvider] = {
            "openai": OpenAIProvider(settings.OPENAI_API_KEY),
            "anthropic": AnthropicProvider(settings.ANTHROPIC_API_KEY),
            "xai": XAIProvider(settings.XAI_API_KEY),
        }
    
    async def get_response_stats(self, provider: BaseAIProvider, prompt: str, response: str) -> Dict[str, Any]:
        """
        Calculate response statistics including token usage, cost, and latency.
        """
        try:
            # Get token usage
            usage = await provider.get_token_usage(prompt, response)
            
            # Calculate cost
            cost = await provider.calculate_cost(usage)
            
            # Calculate latency (in seconds)
            latency = time.time() - provider.start_time if hasattr(provider, 'start_time') else 0
            
            return {
                "usage": usage,
                "cost": cost,
                "latency": round(latency, 2)
            }
        except Exception as e:
            return {
                "usage": {"prompt_tokens": 0, "completion_tokens": 0},
                "cost": 0,
                "latency": 0,
                "error": str(e)
            }
    
    async def _get_model_response_stream(
        self, prompt_id: str, model_name: str, prompt: str
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Get streaming response from a specific model.
        """
        if model_name not in self.providers:
            raise ValueError(f"Invalid model: {model_name}")
        
        provider = self.providers[model_name]
        
        try:
            async for chunk in provider.stream_response(prompt):
                if isinstance(chunk, dict):
                    chunk['is_final'] = True
                    yield chunk
                else:
                    yield {
                        "model_name": model_name,
                        "content": chunk,
                        "is_final": False
                    }
            
        except Exception as e:
            yield {
                "model_name": model_name,
                "error": str(e),
                "is_final": True
            }
    
    async def compare_models(
        self, db: AsyncSession, prompt: str, models: List[str] = None
    ) -> ComparisonResponse:
        """
        Compare responses from multiple AI models for a given prompt.
        """
        # Get models to compare
        if models and len(models) > 0:
            for model in models:
                if model not in self.providers:
                    raise ValueError(f"Invalid model: {model}")
        models_to_compare = models or list(self.providers.keys())
        
        # Create prompt object
        prompt_obj = Prompt(
            content=prompt,
            created_at=datetime.now(timezone.utc)
        )
        db.add(prompt_obj)
        await db.flush()  # Get the prompt ID without committing
        
        # Get responses from all models concurrently
        tasks = []
        for model_name in models_to_compare:
            if model_name in self.providers:
                tasks.append(self._get_model_response(prompt_obj.id, model_name, prompt))
        
        responses = await asyncio.gather(*tasks)
        
        return ComparisonResponse(
            prompt_id=prompt_obj.id,
            prompt=prompt,
            responses=responses,
            created_at=prompt_obj.created_at
        )
    
    async def _get_model_response(
        self, prompt_id: str, model_name: str, prompt: str
    ) -> ModelResponseSchema:
        """
        Get response from a specific model.
        """
        if model_name not in self.providers:
            raise ValueError(f"Invalid model: {model_name}")
        
        provider = self.providers[model_name]
        start_time = time.time()
        
        try:
            response = await provider.get_response(prompt)
            stats = await self.get_response_stats(provider, prompt, response)
            
            return ModelResponseSchema(
                model_name=model_name,
                content=response,
                usage=stats["usage"],
                cost=stats["cost"],
                latency=stats["latency"],
                created_at=datetime.now(timezone.utc)
            )
        except Exception as e:
            return ModelResponseSchema(
                model_name=model_name,
                content=str(e),
                usage={"prompt_tokens": 0, "completion_tokens": 0},
                cost=0,
                latency=round(time.time() - start_time, 2),
                created_at=datetime.now(timezone.utc)
            )
    
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