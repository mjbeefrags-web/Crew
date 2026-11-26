import logging
import time
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from redis.asyncio import Redis

from app.api import admin as admin_routes
from app.api import auth, catalog, commerce, system
from app.core.cache import ResponseCache
from app.core.config import Settings, get_settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger("crewww.api")


def create_app(settings: Settings | None = None) -> FastAPI:
    config = settings or get_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        app.state.redis = (
            Redis.from_url(config.redis_url, decode_responses=True) if config.redis_url else None
        )
        app.state.catalog_cache = ResponseCache(app.state.redis)
        logger.info(
            "application_start env=%s redis_configured=%s", config.app_env, bool(config.redis_url)
        )
        yield
        if app.state.redis is not None:
            await app.state.redis.aclose()
        logger.info("application_stop")

    app = FastAPI(title=config.app_name, version="0.1.0", debug=config.debug, lifespan=lifespan)
    app.state.redis = None
    app.state.catalog_cache = ResponseCache(None)
    app.dependency_overrides[get_settings] = lambda: config
    app.add_middleware(
        CORSMiddleware,
        allow_origins=config.allowed_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "Idempotency-Key", "X-Request-ID"],
    )

    @app.middleware("http")
    async def request_context(request: Request, call_next):
        request_id = request.headers.get("X-Request-ID") or uuid4().hex
        request.state.request_id = request_id
        started = time.perf_counter()
        try:
            response = await call_next(request)
        except Exception:
            logger.exception(
                "request_failed method=%s path=%s request_id=%s",
                request.method,
                request.url.path,
                request_id,
            )
            raise
        duration_ms = (time.perf_counter() - started) * 1000
        response.headers["X-Request-ID"] = request_id
        log = logger.warning if duration_ms >= 500 else logger.info
        log(
            "request method=%s path=%s status=%s duration_ms=%.1f request_id=%s",
            request.method,
            request.url.path,
            response.status_code,
            duration_ms,
            request_id,
        )
        return response

    @app.middleware("http")
    async def security_headers(request: Request, call_next):
        response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        if "/auth/" in request.url.path or "/admin/" in request.url.path:
            cache_control = "no-store"
        elif (
            request.method == "GET"
            and request.url.path.startswith(
                ("/api/v1/products", "/api/v1/categories", "/api/v1/collections")
            )
        ):
            # Read-through cached in Redis; browsers may hold a short copy too.
            cache_control = "public, max-age=30, stale-while-revalidate=120"
        else:
            cache_control = "no-cache"
        response.headers.setdefault("Cache-Control", cache_control)
        if config.app_env == "production":
            response.headers.setdefault(
                "Strict-Transport-Security", "max-age=31536000; includeSubDomains"
            )
        return response

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        del request
        errors = [
            {
                "loc": error.get("loc", []),
                "msg": error.get("msg", "Invalid value"),
                "type": error.get("type", "value_error"),
            }
            for error in exc.errors()
        ]
        return JSONResponse(status_code=422, content={"detail": errors})

    app.include_router(system.router, prefix="/api")
    app.include_router(system.admin, dependencies=[])
    app.include_router(auth.router, prefix=config.api_v1_prefix)
    app.include_router(catalog.router, prefix=config.api_v1_prefix)
    app.include_router(catalog.admin, prefix=config.api_v1_prefix)
    app.include_router(commerce.router, prefix=config.api_v1_prefix)
    app.include_router(admin_routes.router)
    return app


app = create_app()
