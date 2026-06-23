from fastapi import APIRouter

from app.api.v1 import admin, auth, connectors, analyses, policies, audit, mcp

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(connectors.router, prefix="/connectors", tags=["connectors"])
api_router.include_router(analyses.router, prefix="/analyses", tags=["analyses"])
api_router.include_router(policies.router, prefix="/policies", tags=["policies"])
api_router.include_router(audit.router, prefix="/audit", tags=["audit"])
api_router.include_router(mcp.router, prefix="/mcp", tags=["mcp"])
