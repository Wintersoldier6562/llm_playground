from typing import List
from pydantic_settings import BaseSettings
from pydantic import  PostgresDsn

class Settings(BaseSettings):
    PROJECT_NAME: str = "LLM Compare"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # CORS Configuration
    CORS_ORIGINS: List[str] = ["*"]
    
    # Database
    POSTGRES_SERVER: str = "db"
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DB: str = "llm_compare"
    REDIS_HOST: str = "redis"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    
    @property
    def SQLALCHEMY_DATABASE_URI(self) -> PostgresDsn:
        """Get database URI."""
        return PostgresDsn.build(
            scheme="postgresql+asyncpg",
            username=self.POSTGRES_USER,
            password=self.POSTGRES_PASSWORD,
            host=self.POSTGRES_SERVER,
            path=f"{self.POSTGRES_DB}",
        )
    
    # AI Provider API Keys
    OPENAI_API_KEY: str
    ANTHROPIC_API_KEY: str
    XAI_API_KEY: str
    
    # JWT
    SECRET_KEY: str = "2k0wyctYX81gHqJJJoKwzhZDKYllo7V9"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    class Config:
        case_sensitive = True
        env_file = ".env"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.SQLALCHEMY_DATABASE_URI:
            self.SQLALCHEMY_DATABASE_URI = f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}/{self.POSTGRES_DB}"

settings = Settings() 