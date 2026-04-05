import asyncio
import json
import logging
import time
from collections import defaultdict
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from ..core.database import get_db
from ..core.auth import get_current_user
from ..core.config import get_settings
from ..services.rag import retrieve_relevant_chunks, assemble_context, stream_rag_answer

router = APIRouter(prefix="/ai", tags=["ai"])
logger = logging.getLogger(__name__)
settings = get_settings()

# Simple in-memory rate limiter: user_id -> list of timestamps
_rate_limit_store: dict[int, list[float]] = defaultdict(list)


def check_rate_limit(user_id: int) -> bool:
    now = time.time()
    window = 60.0
    limit = settings.ai_rate_limit_rpm
    timestamps = _rate_limit_store[user_id]
    # Remove old entries
    _rate_limit_store[user_id] = [t for t in timestamps if now - t < window]
    if len(_rate_limit_store[user_id]) >= limit:
        return False
    _rate_limit_store[user_id].append(now)
    return True


@router.get("/query")
async def ai_query(
    q: str = Query(..., min_length=1, max_length=512),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """RAG query endpoint — returns SSE stream with token chunks then sources."""
    if not check_rate_limit(current_user.id):
        raise HTTPException(status_code=429, detail=f"Rate limit exceeded: max {settings.ai_rate_limit_rpm} AI queries per minute")

    async def event_stream():
        try:
            # Retrieve relevant chunks
            chunks = await retrieve_relevant_chunks(q, db, top_k=5)
            context, sources = assemble_context(chunks)

            if not chunks:
                yield f"data: {json.dumps({'type': 'token', 'content': 'No relevant articles found in your knowledge base for this query. Try adding articles that cover this topic.'})}\n\n"
                yield f"data: {json.dumps({'type': 'done', 'sources': []})}\n\n"
                return

            # Stream the answer
            async for token in stream_rag_answer(q, context):
                yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"

            # Send sources at the end
            yield f"data: {json.dumps({'type': 'done', 'sources': sources})}\n\n"

        except Exception as e:
            logger.error(f"AI query error: {e}")
            yield f"data: {json.dumps({'type': 'error', 'content': 'An error occurred during AI search.'})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
