from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database.session import get_db
from app.core.config import settings
import redis
from app.core.database.models import User, Prompt, ModelResponse as DBModelResponse
from app.core.schemas.comparison import (
    ComparisonRequest, 
    ComparisonResponse, 
    ModelResponse,
    TokenUsage,
    ModelConfig,
    ComparisonCreateRequest
)
from app.core.dependencies import get_current_user
from typing import AsyncGenerator, List, Dict, Any
from sqlalchemy import select
import uuid
from app.core.services.comparison_service import ComparisonService
from datetime import datetime, timezone
from uuid import uuid4
import asyncio
import json
from fastapi_limiter.depends import RateLimiter

router = APIRouter()


@router.get("/models")
async def get_supported_models(
    req: Request,
    comparison_service: ComparisonService = Depends(ComparisonService)
) -> Dict[str, List[str]]:
    """
    Get all supported models from each AI provider.
    Returns a dictionary mapping provider names to their supported models.
    Cached in Redis for 24 hours.
    """
    provider_models = await comparison_service.get_models()
    # convert to dict of provider name to list of model_names
    return {provider_model.provider: [model_config.model_name for model_config in provider_model.models] for provider_model in provider_models}

@router.get("/provider-models")
async def get_supported_models_for_provider(
    comparison_service: ComparisonService = Depends(ComparisonService)
) -> List[ModelConfig]:
    
    provider_models = await comparison_service.get_models()
    # convert to list of ModelConfig
    model_configs = []
    for provider_model in provider_models:
        model_configs.extend(provider_model.models)
    return model_configs

@router.post("/compare")
async def stream_comparison(
    request: ComparisonRequest,
    req: Request,
    current_user: User = Depends(get_current_user),
    comparison_service: ComparisonService = Depends(ComparisonService)
) -> StreamingResponse:
    """
    Stream responses from multiple AI models for a given prompt.
    Each model streams its chunks independently, and sends a final payload with metrics when done.
    """
    
    try:
        async def generate() -> AsyncGenerator[str, None]:
            # Get models to compare
            if request.provider_models and len(request.provider_models.keys()) > 0:
                for provider in request.provider_models.keys():
                    if provider not in comparison_service.providers:
                        raise ValueError(f"Invalid provider: {provider}")
            ai_providers = request.provider_models or comparison_service.default_provider_models
            max_tokens = request.max_tokens
            # Create prompt object
            prompt_obj = Prompt(
                id=uuid4(),
                content=request.prompt,
                user_id=current_user.id,
                created_at=datetime.now(timezone.utc)
            )
            
            # Create streaming tasks for each model
            streams = []
            for provider, model_name in ai_providers.items():
                if provider in comparison_service.providers:
                    streams.append(comparison_service._get_model_response_stream(
                        prompt_obj.id, provider, model_name, prompt_obj.content, max_tokens
                    ))

            # Process streams concurrently while yielding chunks immediately
            async def process_streams():
                # Create a queue for each stream
                queues = [asyncio.Queue() for _ in streams]
                
                # Process each stream and put chunks in its queue
                async def process_and_queue(stream, queue):
                    try:
                        async for response in stream:
                            await queue.put(response)
                    except Exception as e:
                        await queue.put({"error": str(e)})
                
                # Create tasks for each stream
                tasks = []
                for stream, queue in zip(streams, queues):
                    task = asyncio.create_task(process_and_queue(stream, queue))
                    tasks.append(task)
                
                # Process all queues concurrently
                while tasks:
                    # Create tasks for getting items from queues
                    queue_tasks = [asyncio.create_task(queue.get()) for queue in queues]
                    
                    # Wait for any queue to have data
                    done, pending = await asyncio.wait(
                        queue_tasks,
                        return_when=asyncio.FIRST_COMPLETED
                    )
                    
                    # Process completed queues
                    for future in done:
                        try:
                            response = future.result()
                            # Format as SSE
                            yield f"data: {json.dumps(response)}\n\n"
                            
                            # If this was a final response, remove the queue
                            if isinstance(response, dict) and response.get('is_final'):
                                idx = queue_tasks.index(future)
                                queues.pop(idx)
                                tasks.pop(idx)
                        except Exception as e:
                            yield f"data: {json.dumps({'error': str(e)})}\n\n"
                    
                    # Cancel any pending queue tasks
                    for task in pending:
                        task.cancel()
                
                # Send completion message
                yield "data: [DONE]\n\n"

            async for chunk in process_streams():
                yield chunk

        return StreamingResponse(
            generate(),
            media_type="text/event-stream"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error streaming responses: {str(e)}"
        )

@router.post("/compare-free",  dependencies=[Depends(RateLimiter(times=2000, hours=1))])
async def stream_comparison_free(
    request: ComparisonRequest,
    req: Request,
    comparison_service: ComparisonService = Depends(ComparisonService)
) -> StreamingResponse:
    """
    Stream responses from multiple AI models for a given prompt.
    Each model streams its chunks indepai_providers.keysendently, and sends a final payload with metrics when done.
    """
    
    try:
        async def generate() -> AsyncGenerator[str, None]:
            # Get models to compare
            if request.provider_models and len(request.provider_models.keys()) > 0:
                for provider in request.provider_models.keys():
                    if provider not in comparison_service.providers:
                        raise ValueError(f"Invalid provider: {provider}")
            ai_providers = request.provider_models or comparison_service.default_provider_models
            max_tokens = request.max_tokens
            # Create prompt object
            prompt_obj = Prompt(
                id=uuid4(),
                content=request.prompt,
                user_id=str(uuid.uuid4()),
                created_at=datetime.now(timezone.utc)
            )
            
            # Create streaming tasks for each model
            streams = []
            for provider, model_name in ai_providers.items():
                if provider in comparison_service.providers:
                    print(f"Streaming response from {provider} {model_name}", flush=True)
                    streams.append(comparison_service._get_model_response_stream(
                        prompt_obj.id, provider, model_name, prompt_obj.content, max_tokens
                    ))

            # Process streams concurrently while yielding chunks immediately
            async def process_streams():
                # Create a queue for each stream
                queues = [asyncio.Queue() for _ in streams]
                
                # Process each stream and put chunks in its queue
                async def process_and_queue(stream, queue):
                    try:
                        async for response in stream:
                            await queue.put(response)
                    except Exception as e:
                        await queue.put({"error": str(e)})
                
                # Create tasks for each stream
                tasks = []
                for stream, queue in zip(streams, queues):
                    task = asyncio.create_task(process_and_queue(stream, queue))
                    tasks.append(task)
                
                # Process all queues concurrently
                while tasks:
                    # Create tasks for getting items from queues
                    queue_tasks = [asyncio.create_task(queue.get()) for queue in queues]
                    
                    # Wait for any queue to have data
                    done, pending = await asyncio.wait(
                        queue_tasks,
                        return_when=asyncio.FIRST_COMPLETED
                    )
                    
                    # Process completed queues
                    for future in done:
                        try:
                            response = future.result()
                            # Format as SSE
                            print(f"response: {response}", flush=True)
                            yield f"data: {json.dumps(response)}\n\n"
                            
                            # If this was a final response, remove the queue
                            if isinstance(response, dict) and response.get('is_final'):
                                idx = queue_tasks.index(future)
                                queues.pop(idx)
                                tasks.pop(idx)
                        except Exception as e:
                            yield f"data: {json.dumps({'error': str(e)})}\n\n"
                    
                    # Cancel any pending queue tasks
                    for task in pending:
                        task.cancel()
                
                print("done", flush=True)
                # Send completion message
                yield "data: [DONE]\n\n"

            async for chunk in process_streams():
                print(f"chunk: {chunk}", flush=True)
                yield chunk

        return StreamingResponse(
            generate(),
            media_type="text/event-stream"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error streaming responses: {str(e)}"
        )

@router.get("/history", response_model=List[ComparisonResponse])
async def get_user_history(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> List[ComparisonResponse]:
    """
    Get the user's prompt and response history.
    """
    # Get all prompts for the current user
    result = await db.execute(
        select(Prompt)
        .where(Prompt.user_id == current_user.id)
        .order_by(Prompt.created_at.desc())
    )
    prompts = result.scalars().all()
    
    history = []
    for prompt in prompts:
        # Get all responses for this prompt
        result = await db.execute(
            select(DBModelResponse)
            .where(DBModelResponse.prompt_id == prompt.id)
        )
        responses = result.scalars().all()
        
        history.append(
            ComparisonResponse(
                prompt_id=prompt.id,
                prompt=prompt.content,
                created_at=prompt.created_at,
                responses=[
                    ModelResponse(
                        model_name=r.model_name,
                        content=r.content,
                        usage=TokenUsage(
                            prompt_tokens=r.prompt_tokens,
                            completion_tokens=r.completion_tokens,
                            total_tokens=r.total_tokens
                        ),
                        cost=r.cost,
                        latency=r.latency,
                        created_at=r.created_at
                    )
                    for r in responses
                ]
            )
        )
    return history

@router.post("/create", response_model=ComparisonResponse)
async def create_comparison(
    request: ComparisonCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    comparison_service: ComparisonService = Depends(ComparisonService)
) -> ComparisonResponse:
    """
    Create a new comparison with prompt and model responses.
    """
    return await comparison_service.create_comparison(db, request, current_user)

@router.delete("/{prompt_id}")
async def delete_prompt(
    prompt_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> dict:
    """
    Delete a prompt and its associated responses.
    """
    # Get the prompt
    result = await db.execute(
        select(Prompt)
        .where(Prompt.id == prompt_id)
        .where(Prompt.user_id == current_user.id)
    )
    prompt = result.scalar_one_or_none()
    
    if not prompt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prompt not found"
        )
    
    # Delete the prompt (cascade will delete responses)
    await db.delete(prompt)
    await db.commit()
    
    return {"message": "Prompt and responses deleted successfully"}