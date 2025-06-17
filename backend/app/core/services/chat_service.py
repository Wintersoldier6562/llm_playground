from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, and_, func
from sqlalchemy.orm import selectinload
from app.core.database.models import ChatSession, ChatMessage, SessionType
from app.core.schemas.chat import (
    ChatSessionCreate
)
from uuid import UUID
import openai
from anthropic import Anthropic
from app.core.config import settings
from app.core.services.model_service import ModelService
from decimal import Decimal

class ChatService:
    def __init__(self):
        # Initialize provider clients
        self.openai_client = openai.AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.anthropic_client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        
        # Global limits
        self.MAX_SESSIONS_PER_USER = 30
        self.MAX_MESSAGES_PER_SESSION = 1000
        
    async def create_session(
        self, 
        db: AsyncSession, 
        user_id: UUID, 
        data: ChatSessionCreate,
        model_service: ModelService
    ) -> ChatSession:
        # Validate provider and model
        models = await model_service.get_models()
        if data.provider not in [model.provider for model in models]:
            raise ValueError(f"Unsupported provider: {data.provider}")
        provider_models = next((provider.models for provider in models if provider.provider == data.provider), [])
        if data.model not in [model.model_name for model in provider_models]:
            raise ValueError(f"Unsupported model: {data.model}")
        # Check total session limit
        total_sessions = await self.get_user_total_sessions_count(db, user_id)
        if total_sessions >= self.MAX_SESSIONS_PER_USER:
            raise ValueError(f"Maximum number of sessions ({self.MAX_SESSIONS_PER_USER}) reached")

        print(data.session_type, flush=True)
        if data.context is None:
            data.context = ""
        # Create new session
        session = ChatSession(
            user_id=user_id,
            provider=data.provider,
            model=data.model,
            title=data.title,
            session_type=data.session_type.value,
            context=data.context
        )
        db.add(session)
        await db.commit()
        print(session, flush=True)
        # Refresh session with messages relationship loaded
        query = select(ChatSession).options(selectinload(ChatSession.messages)).where(ChatSession.id == session.id)
        result = await db.execute(query)
        session = result.scalar_one()
        return session

    async def get_session(
        self, 
        db: AsyncSession, 
        session_id: UUID, 
        user_id: UUID,
        include_messages: bool = False
    ) -> Optional[ChatSession]:
        query = select(ChatSession).where(
            and_(
                ChatSession.id == session_id,
                ChatSession.user_id == user_id
            )
        )
        if include_messages:
            query = query.options(selectinload(ChatSession.messages))
            
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def get_user_total_sessions_count(
        self,
        db: AsyncSession,
        user_id: UUID
    ) -> int:
        query = select(func.count()).select_from(ChatSession).where(ChatSession.user_id == user_id)
        result = await db.execute(query)
        return result.scalar_one()

    async def get_session_messages_count(
        self,
        db: AsyncSession,
        session_id: UUID
    ) -> int:
        query = select(func.count()).select_from(ChatMessage).where(ChatMessage.session_id == session_id)
        result = await db.execute(query)
        return result.scalar_one()

    async def store_message(
        self,
        db: AsyncSession,
        session_id: UUID,
        role: str,
        content: str,
        usage: Optional[Dict[str, Any]] = None,
        cost: Optional[Decimal] = None,
        latency: Optional[float] = None
    ) -> ChatMessage:
        message = ChatMessage(
            session_id=session_id,
            role=role,
            content=content,
            prompt_tokens=usage.get("prompt_tokens") if usage else None,
            completion_tokens=usage.get("completion_tokens") if usage else None,
            total_tokens=usage.get("total_tokens") if usage else None,
            cost=cost,
            latency=latency
        )
        db.add(message)
        await db.commit()
        await db.refresh(message)
        return message

    async def list_sessions(
        self,
        db: AsyncSession,
        user_id: UUID,
        provider: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[ChatSession]:
        query = select(ChatSession).where(ChatSession.user_id == user_id)
        if provider:
            query = query.where(ChatSession.provider == provider)
        query = query.offset(skip).limit(limit)
        result = await db.execute(query)
        sessions = result.scalars().all()
        total = await self.get_user_total_sessions_count(db, user_id)
        return sessions, total

    async def delete_session(
        self,
        db: AsyncSession,
        session_id: UUID,
        user_id: UUID
    ) -> bool:
        """
        Delete a chat session.
        Returns True if the session was found and deleted, False otherwise.
        """
        query = select(ChatSession).where(
            and_(
                ChatSession.id == session_id,
                ChatSession.user_id == user_id
            )
        )
        result = await db.execute(query)
        session = result.scalar_one_or_none()
        if session:
            await db.delete(session)
            await db.commit()
            return True
        return False

    async def get_session_messages(
        self,
        db: AsyncSession,
        session_id: UUID
    ) -> List[ChatMessage]:
        query = select(ChatMessage).where(ChatMessage.session_id == session_id)
        result = await db.execute(query)
        return result.scalars().all()

