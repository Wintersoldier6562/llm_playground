from fastapi import APIRouter
from app.api.v1.endpoints import auth, chat, model

# Regular API router with authentication
api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(model.router, prefix="/comparison", tags=["comparison"])
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])