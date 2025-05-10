from typing import List, Optional
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database.models import Prompt, ModelResponse
from app.core.schemas.comparison import ComparisonHistory, ComparisonHistoryList, ModelResponse as ModelResponseSchema, TokenUsage
from uuid import UUID

class HistoryService:
    async def get_comparison_history(
        self,
        db: AsyncSession,
        skip: int = 0,
        limit: int = 10
    ) -> ComparisonHistoryList:
        # Query prompts with their responses
        query = (
            select(Prompt)
            .order_by(desc(Prompt.created_at))
            .offset(skip)
            .limit(limit)
        )
        result = await db.execute(query)
        prompts = result.scalars().all()
        
        # Get total count
        count_query = select(Prompt)
        count_result = await db.execute(count_query)
        total = len(count_result.scalars().all())
        
        # Build response
        items = []
        for prompt in prompts:
            # Get responses for this prompt
            responses_query = (
                select(ModelResponse)
                .where(ModelResponse.prompt_id == prompt.id)
                .order_by(ModelResponse.created_at)
            )
            responses_result = await db.execute(responses_query)
            responses = responses_result.scalars().all()
            
            # Convert responses to schema
            model_responses = []
            for response in responses:
                token_usage = TokenUsage(
                    prompt_tokens=response.prompt_tokens,
                    completion_tokens=response.completion_tokens,
                    total_tokens=response.total_tokens
                )
                model_responses.append(
                    ModelResponseSchema(
                        model_name=response.model_name,
                        content=response.content,
                        usage=token_usage,
                        cost=response.cost,
                        latency=response.latency,
                        created_at=response.created_at
                    )
                )
            
            items.append(
                ComparisonHistory(
                    id=prompt.id,
                    prompt_id=prompt.id,
                    prompt=prompt.content,
                    responses=model_responses,
                    created_at=prompt.created_at
                )
            )
        
        return ComparisonHistoryList(items=items, total=total)
    
    async def get_comparison_by_id(
        self,
        db: AsyncSession,
        comparison_id: UUID
    ) -> Optional[ComparisonHistory]:
        # Query prompt
        query = select(Prompt).where(Prompt.id == comparison_id)
        result = await db.execute(query)
        prompt = result.scalar_one_or_none()
        
        if not prompt:
            return None
        
        # Get responses for this prompt
        responses_query = (
            select(ModelResponse)
            .where(ModelResponse.prompt_id == prompt.id)
            .order_by(ModelResponse.created_at)
        )
        responses_result = await db.execute(responses_query)
        responses = responses_result.scalars().all()
        
        # Convert responses to schema
        model_responses = []
        for response in responses:
            token_usage = TokenUsage(
                prompt_tokens=response.prompt_tokens,
                completion_tokens=response.completion_tokens,
                total_tokens=response.total_tokens
            )
            model_responses.append(
                ModelResponseSchema(
                    model_name=response.model_name,
                    content=response.content,
                    usage=token_usage,
                    cost=response.cost,
                    latency=response.latency,
                    created_at=response.created_at
                )
            )
        
        return ComparisonHistory(
            id=prompt.id,
            prompt_id=prompt.id,
            prompt=prompt.content,
            responses=model_responses,
            created_at=prompt.created_at
        ) 