from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database.session import get_db
from app.core.database.models import User, Prompt, ModelResponse as DBModelResponse
from app.core.schemas.comparison import (
    ComparisonRequest, 
    ComparisonResponse, 
    ModelResponse,
    TokenUsage,
    ComparisonCreateRequest
)
from app.core.dependencies import get_current_user
from typing import AsyncGenerator, List
from sqlalchemy import select
import uuid
from app.core.services.comparison_service import ComparisonService
from datetime import datetime, timezone
from uuid import uuid4
import asyncio
import json

router = APIRouter()

@router.post("/stream")
async def stream_comparison(
    request: ComparisonRequest,
    current_user: User = Depends(get_current_user),
    comparison_service: ComparisonService = Depends(ComparisonService)
) -> StreamingResponse:
    """
    Stream responses from multiple AI models for a given prompt.
    Each model streams its chunks independently, and sends a final payload with metrics when done.
    """
    print("Streaming comparison", flush=True)
    try:
        async def generate() -> AsyncGenerator[str, None]:
            # Get models to compare
            if request.models and len(request.models) > 0:
                for model in request.models:
                    if model not in comparison_service.providers:
                        raise ValueError(f"Invalid model: {model}")
            models_to_compare = request.models or list(comparison_service.providers.keys())
            
            # Create prompt object
            prompt_obj = Prompt(
                id=uuid4(),
                content=request.prompt,
                user_id=current_user.id,
                created_at=datetime.now(timezone.utc)
            )
            
            # Create streaming tasks for each model
            streams = []
            for model_name in models_to_compare:
                if model_name in comparison_service.providers:
                    streams.append(comparison_service._get_model_response_stream(
                        prompt_obj.id, model_name, prompt_obj.content
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