from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database.session import get_db
from app.core.database.models import User, Prompt
from app.core.schemas.comparison import ComparisonRequest
from app.core.dependencies import get_current_user
from app.core.services.comparison_service import ComparisonService
import asyncio
import json
from typing import AsyncGenerator, List
from datetime import datetime, timezone
from uuid import uuid4

router = APIRouter()
comparison_service = ComparisonService()

@router.get("/comparison/stream")
async def stream_comparison(
    prompt: str = Query(..., description="The prompt to compare the models on"),
    models: List[str] = Query(None, description="The models to compare the prompt on"),
    current_user: User = Depends(get_current_user),
) -> StreamingResponse:
    """
    Stream responses from multiple AI models for a given prompt.
    Each model streams its chunks independently, and sends a final payload with metrics when done.
    """
    print("Streaming comparison", flush=True)
    try:
        async def generate() -> AsyncGenerator[str, None]:
            # Get models to compare
            if models and len(models) > 0:
                for model in models:
                    if model not in comparison_service.providers:
                        raise ValueError(f"Invalid model: {model}")
            models_to_compare = models or list(comparison_service.providers.keys())
            
            # Create prompt object
            prompt_obj = Prompt(
                id=uuid4(),
                content=prompt,
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