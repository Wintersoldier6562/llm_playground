from fastapi import APIRouter, Depends, HTTPException, status
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
from typing import List
from sqlalchemy import select
import uuid
from app.core.services.comparison_service import ComparisonService
from datetime import datetime

router = APIRouter()

@router.post("/compare", response_model=ComparisonResponse)
async def compare_models(
    request: ComparisonRequest,
    current_user: User = Depends(get_current_user),
    comparison_service: ComparisonService = Depends(ComparisonService)
) -> ComparisonResponse:
    """
    Compare responses from multiple AI models for a given prompt.
    """
    try:
        return await comparison_service.compare_models(request, current_user)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error comparing models: {str(e)}"
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