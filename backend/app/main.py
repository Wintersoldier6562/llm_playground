"""Main application module."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.api import api_router
from app.core.database.session import AsyncSessionLocal
from app.core.database.init_db import init_db
import asyncio

app = FastAPI(
    title="AI Model Playground API",
    description="API for comparing responses from different AI models",
    version="1.0.0",
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
    except Exception as e:
        print(f"Error initializing database: {str(e)}")
        raise

@app.get("/")
async def root():
    return {"message": "Welcome to AI Model Playground API"}

@app.get("/health")
async def health():
    return {"status": "ok"} 