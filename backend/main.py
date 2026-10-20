from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException
from pathlib import PurePosixPath

from api import router
from config import CORS_ORIGINS, FRONTEND_DIST, SERVE_FRONTEND


class FrontendFiles(StaticFiles):
    async def get_response(self, path, scope):
        try:
            response = await super().get_response(path, scope)
        except HTTPException as error:
            if error.status_code != 404 or PurePosixPath(path).suffix or any(part.startswith('.') for part in PurePosixPath(path).parts) or path.startswith(("assets/", "brand/")):
                raise
            response = FileResponse(FRONTEND_DIST / "index.html")
        if response.media_type == "text/html":
            response.headers["Cache-Control"] = "no-cache"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["X-Content-Type-Options"] = "nosniff"
        return response


api = FastAPI(title="DeathLine API")
api.include_router(router)
api.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=['GET', 'PUT', 'POST', 'DELETE', 'OPTIONS', 'PATCH'],
    allow_headers=["Content-Type"],
)


@api.get('/healthz', include_in_schema=False)
def health():
    return {"status": "ok"}


if SERVE_FRONTEND:
    if not (FRONTEND_DIST / "index.html").is_file():
        raise RuntimeError("Build the frontend before starting with SERVE_FRONTEND=true")
    app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)
    app.add_api_route('/healthz', health, include_in_schema=False)
    app.mount('/api', api)
    app.mount('/', FrontendFiles(directory=FRONTEND_DIST, html=True))
else:
    app = api
