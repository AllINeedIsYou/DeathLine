from fastapi import APIRouter

from .service.service import service_router
from .roles.admin import admin_router
from .auth import auth_router

router=APIRouter()

router.include_router(service_router)
router.include_router(admin_router)
router.include_router(auth_router)