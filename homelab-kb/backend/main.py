import logging
import httpx
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .core.config import get_settings
from .core.database import engine, Base
from .routers import auth, articles, search, ai, users
from .services.embeddings import check_model_available

settings = get_settings()
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Check Ollama models at startup
    embed_ok = await check_model_available(settings.ollama_embed_model)
    rag_ok = await check_model_available(settings.ollama_rag_model)
    if not embed_ok:
        logger.warning(
            f"Ollama embedding model '{settings.ollama_embed_model}' is not available. "
            "AI search will be degraded. Run: ollama pull nomic-embed-text"
        )
    if not rag_ok:
        logger.warning(
            f"Ollama RAG model '{settings.ollama_rag_model}' is not available. "
            "AI search will be degraded. Run: ollama pull llama3.2:3b"
        )
    if embed_ok and rag_ok:
        logger.info("Ollama models verified: nomic-embed-text and llama3.2:3b are available.")
    yield


app = FastAPI(
    title="Homelab Knowledge Base API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline'; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data: blob:; "
        "font-src 'self' data:;"
    )
    return response


# Routers
app.include_router(auth.router, prefix="/api")
app.include_router(articles.router, prefix="/api")
app.include_router(search.router, prefix="/api")
app.include_router(ai.router, prefix="/api")
app.include_router(users.router, prefix="/api")


@app.get("/api/health")
async def health():
    return {"status": "ok"}
