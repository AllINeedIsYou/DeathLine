from fastapi import APIRouter

from .service.service import service_router
from .roles.admin import admin_router

router=APIRouter()

router.include_router(service_router)
router.include_router(admin_router)