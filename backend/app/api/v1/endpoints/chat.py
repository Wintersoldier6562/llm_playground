from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, AsyncGenerator
from app.core.database.session import get_db
from app.core.dependencies import get_current_user
from app.core.database.models import User
from app.core.services.chat_service import ChatService
from app.core.services.model_service import ModelService
from app.core.schemas.chat import (
    ChatSessionCreate,
    ChatSessionUpdate,
    ChatSessionResponse,
    ChatSessionList,
    ChatCompletionRequest
)
from app.core.database.models import SessionType
from uuid import UUID
import json

router = APIRouter()
chat_service = ChatService()

@router.post("/sessions", response_model=ChatSessionResponse, status_code=status.HTTP_201_CREATED)
async def create_chat_session(
    data: ChatSessionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    model_service: ModelService = Depends(ModelService)
):
    """
    Create a new chat session.
    """
    try:
        print(data, flush=True)
        session = await chat_service.create_session(db, current_user.id, data, model_service)
        return session
    except ValueError as e:
        print(e, flush=True)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/sessions", response_model=ChatSessionList)
async def list_chat_sessions(
    provider: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List all chat sessions for the current user.
    """
    sessions, total = await chat_service.list_sessions(
        db,
        current_user.id,
        provider=provider,
        skip=skip,
        limit=limit
    )
    return ChatSessionList(sessions=sessions, total=total)

@router.get("/sessions/{session_id}", response_model=ChatSessionResponse)
async def get_chat_session(
    session_id: UUID,
    include_messages: bool = Query(False, description="Include session messages"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific chat session by ID.
    """
    session = await chat_service.get_session(
        db,
        session_id,
        current_user.id,
        include_messages=include_messages
    )
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found"
        )
    return session

@router.patch("/sessions/{session_id}", response_model=ChatSessionResponse)
async def update_chat_session(
    session_id: UUID,
    session_in: ChatSessionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update a chat session's metadata.
    """
    session = await chat_service.update_session(
        db,
        session_id,
        current_user.id,
        session_in
    )
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found"
        )
    return session

@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_chat_session(
    session_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a chat session.
    Returns 204 No Content on success, 404 Not Found if the session doesn't exist.
    """
    deleted = await chat_service.delete_session(
        db,
        session_id,
        current_user.id
    )
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found"
        )

@router.post("/sessions/{session_id}/chat")
async def chat_completion(
    session_id: UUID,
    request: ChatCompletionRequest,
    req: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    model_service: ModelService = Depends(ModelService)
):
    """
    Send a message to the model in a chat session and get a response.
    Supports both streaming and non-streaming responses.
    
    Parameters:
    - session_id: UUID of the chat session
    - request: Chat completion request containing:
        - message: User message to send
        - provider: LLM provider (e.g., openai, anthropic)
        - model: Model name (e.g., gpt-4, claude-3-opus)
        - stream: Whether to stream the response
        - temperature: Sampling temperature (0-2)
        - max_tokens: Maximum tokens to generate
        - system_message: Optional system message
    """
    try:
        # Validate session exists and belongs to user
        session = await chat_service.get_session(db, session_id, current_user.id, include_messages=True)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Chat session not found"
            )
        
        # Validate provider and model match session
        if session.provider != request.provider or session.model != request.model:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Provider and model must match the session configuration"
            )

        # Store user message in database
        await chat_service.store_message(
            db=db,
            session_id=session_id,
            role="user",
            content=request.message
        )
        messages = []
        request_message = request.message
        # Get conversation history and format messages
        if session.session_type == SessionType.CONVERSATION:
            messages = [{"role": m.role, "content": m.content} for m in session.messages]

        if session.session_type == SessionType.FIXED_CONTEXT.value:
            context = ("You are a helpful assistant that can answer questions and help with tasks. You are given a fixed context and a user message. You need to answer the user message based on the context."
                "The context is: " + session.context + "\n\n" + "The user message is: " + request.message
            )
            request_message = context
        
        messages.append({"role": "user", "content": request_message})

        async def generate() -> AsyncGenerator[str, None]:
            try:
                async for chunk in model_service._get_model_response_stream(
                    prompt_id=str(session_id),
                    provider_name=request.provider,
                    model_name=request.model,
                    messages=messages,
                    max_tokens=request.max_tokens or 4096
                ):
                    if chunk.get("error"):
                        yield f"data: {json.dumps({'error': chunk['error']})}\n\n"
                        yield "data: [DONE]\n\n"
                        return

                    if chunk.get("content"):
                        yield f"data: {json.dumps(chunk)}\n\n"

                    if chunk.get("is_final"):
                        # Store assistant's message in database
                        await chat_service.store_message(
                            db=db,
                            session_id=session_id,
                            role="assistant",
                            content=chunk.get("content"),
                            usage=chunk.get("usage"),
                            cost=chunk.get("cost"),
                            latency=chunk.get("latency")
                        )
                        yield "data: [DONE]\n\n"

            except Exception as e:
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
                yield "data: [DONE]\n\n"

        return StreamingResponse(
            generate(),
            media_type="text/event-stream"
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing chat completion: {str(e)}"
        ) 