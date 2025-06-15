"""Main application module."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.api import api_router
from app.core.database.session import AsyncSessionLocal
from app.core.database.init_db import init_db
from app.core.utils import get_ip_address
import asyncio
import redis.asyncio as redis
from fastapi_limiter import FastAPILimiter

app = FastAPI(
    title="AI Model Playground API",
    description="API for comparing responses from different AI models",
    version="1.0.0",
    openapi_url=None,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API router
app.include_router(api_router, prefix="/api/v1")

@app.on_event("startup")
async def startup_event():
    """Initialize database on startup."""
    try:
        async with AsyncSessionLocal() as session:
            await init_db(session)
        # Redis connection
        redis_url = f"redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}/{settings.REDIS_DB}"
        redis_connection = await redis.from_url(redis_url, encoding="utf-8", decode_responses=True)
        # Configure Rate Limiting
        await FastAPILimiter.init(redis_connection, identifier=get_ip_address)
    except Exception as e:
        print(f"Error initializing database: {str(e)}")
        raise

@app.get("/")
async def root():
    return {"message": "Welcome to AI Model Playground API"}

@app.get("/health")
async def health():
    return {"status": "ok"} 