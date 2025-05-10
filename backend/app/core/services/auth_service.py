from datetime import datetime, timedelta
from typing import Optional, Set
from jose import JWTError, jwt
import bcrypt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database.models import User
from app.core.schemas.auth import UserCreate, TokenPayload
from app.core.config import settings
from uuid import UUID

class AuthService:
    def __init__(self):
        self.blacklisted_tokens: Set[str] = set()

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        return bcrypt.checkpw(
            plain_password.encode('utf-8'),
            hashed_password.encode('utf-8')
        )

    def get_password_hash(self, password: str) -> str:
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
        return hashed.decode('utf-8')

    def create_access_token(self, subject: UUID, expires_delta: Optional[timedelta] = None) -> str:
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode = {"exp": expire, "sub": str(subject)}
        encoded_jwt = jwt.encode(
            to_encode, 
            settings.SECRET_KEY, 
            algorithm=settings.ALGORITHM
        )
        return encoded_jwt

    def create_refresh_token(self, subject: UUID) -> str:
        expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        to_encode = {"exp": expire, "sub": str(subject)}
        encoded_jwt = jwt.encode(
            to_encode, 
            settings.SECRET_KEY, 
            algorithm=settings.ALGORITHM
        )
        return encoded_jwt

    async def authenticate_user(self, db: AsyncSession, email: str, password: str) -> Optional[User]:
        query = select(User).where(User.email == email)
        result = await db.execute(query)
        user = result.scalar_one_or_none()
        
        if not user:
            return None
        if not self.verify_password(password, user.hashed_password):
            return None
        return user

    async def get_user_by_email(self, db: AsyncSession, email: str) -> Optional[User]:
        query = select(User).where(User.email == email)
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def create_user(self, db: AsyncSession, user_in: UserCreate) -> User:
        user = User(
            email=user_in.email,
            hashed_password=self.get_password_hash(user_in.password),
            full_name=user_in.full_name
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        return user

    def verify_token(self, token: str) -> Optional[TokenPayload]:
        try:
            # Check if token is blacklisted
            if token in self.blacklisted_tokens:
                return None
                
            payload = jwt.decode(
                token, 
                settings.SECRET_KEY, 
                algorithms=[settings.ALGORITHM]
            )
            return TokenPayload(**payload)
        except JWTError:
            return None
            
    def blacklist_token(self, token: str) -> None:
        """
        Add a token to the blacklist.
        """
        self.blacklisted_tokens.add(token)
        
    def is_token_blacklisted(self, token: str) -> bool:
        """
        Check if a token is blacklisted.
        """
        return token in self.blacklisted_tokens 