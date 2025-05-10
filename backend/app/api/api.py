from fastapi import APIRouter
from app.api.v1.endpoints import auth, comparison, compare

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(comparison.router, prefix="/comparison", tags=["comparison"]) 
api_router.include_router(compare.router, tags=["compare"])