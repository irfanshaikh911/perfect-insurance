from fastapi import APIRouter

from app.api.routes.agent_data import router as agent_data_router
from app.api.routes.auth import router as auth_router
from app.api.routes.plans import router as plans_router
from app.api.routes.products import router as products_router

api_router = APIRouter(prefix="/api")
api_router.include_router(auth_router)
api_router.include_router(agent_data_router)
api_router.include_router(products_router)
api_router.include_router(plans_router)
