from contextlib import asynccontextmanager
import logging
from pathlib import Path
from time import perf_counter

from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, Response
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.database import get_db
from app.routers import seasons, managers, stats, sync, draft, feedback
from app.schemas.health import HealthResponse


logger = logging.getLogger("app.requests")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    yield


app = FastAPI(title="Fantasy Football Dashboard API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_security_headers_and_log(request: Request, call_next):
    started = perf_counter()
    try:
        response: Response = await call_next(request)
    except Exception:
        logger.exception(
            "request_failed method=%s path=%s duration_ms=%.1f",
            request.method,
            request.url.path,
            (perf_counter() - started) * 1000,
        )
        raise
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "base-uri 'self'; "
        "connect-src 'self'; "
        "font-src 'self'; "
        "form-action 'self'; "
        "frame-ancestors 'none'; "
        "img-src 'self' data:; "
        "object-src 'none'; "
        "script-src 'self'; "
        "style-src 'self' 'unsafe-inline'"
    )
    response.headers["Permissions-Policy"] = (
        "camera=(), geolocation=(), microphone=(), payment=()"
    )
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    logger.info(
        "request_complete method=%s path=%s status=%s duration_ms=%.1f",
        request.method,
        request.url.path,
        response.status_code,
        (perf_counter() - started) * 1000,
    )
    return response


app.include_router(seasons.router, prefix="/api")
app.include_router(managers.router, prefix="/api")
app.include_router(stats.router, prefix="/api")
app.include_router(sync.router, prefix="/api")
app.include_router(draft.router, prefix="/api")
app.include_router(feedback.router, prefix="/api")


@app.get("/api/health", response_model=HealthResponse)
def health(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
    except SQLAlchemyError as exc:
        logger.exception("Database readiness check failed")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database unavailable",
        ) from exc
    return HealthResponse(status="ok", database="ok")


# --- Serve built frontend in production ---
_STATIC_DIR = Path(__file__).resolve().parent.parent / "static"

if _STATIC_DIR.is_dir():
    app.mount("/assets", StaticFiles(directory=_STATIC_DIR / "assets"), name="assets")

    @app.get("/{full_path:path}")
    def serve_spa(full_path: str):
        """Serve the React SPA for any non-API route."""
        file = (_STATIC_DIR / full_path).resolve()
        if _STATIC_DIR.resolve() not in file.parents:
            return FileResponse(_STATIC_DIR / "index.html")
        if file.is_file():
            return FileResponse(file)
        return FileResponse(_STATIC_DIR / "index.html")
