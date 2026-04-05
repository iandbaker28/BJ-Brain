import logging
import json
import httpx
from typing import AsyncIterator
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from ..core.config import get_settings
from ..services.embeddings import generate_embedding
from ..models.article import ArticleChunk, Article

settings = get_settings()
logger = logging.getLogger(__name__)

RAG_SYSTEM_PROMPT = """You are an internal knowledge base assistant for a homelab environment.
Answer questions ONLY based on the provided documentation context below.
Do not invent or assume any information not explicitly present in the articles.
If the provided articles do not contain enough information to answer the question, say so clearly.
Always cite which article(s) the answer comes from.
Match specific configuration details (IPs, hostnames, paths, etc.) exactly as described in the articles."""


async def retrieve_relevant_chunks(
    query: str, db: AsyncSession, top_k: int = 5
) -> list[dict]:
    """Embed the query and retrieve the top-k most similar article chunks."""
    query_embedding = await generate_embedding(query)
    if query_embedding is None:
        return []

    # pgvector cosine similarity search
    sql = text("""
        SELECT ac.id, ac.article_id, ac.chunk_text, ac.chunk_index,
               a.title,
               1 - (ac.embedding <=> CAST(:embedding AS vector)) AS similarity
        FROM article_chunks ac
        JOIN articles a ON a.id = ac.article_id
        WHERE ac.embedding IS NOT NULL
          AND a.is_published = 1
        ORDER BY ac.embedding <=> CAST(:embedding AS vector)
        LIMIT :top_k
    """)

    result = await db.execute(
        sql,
        {"embedding": str(query_embedding), "top_k": top_k},
    )
    rows = result.fetchall()
    return [
        {
            "chunk_id": row.id,
            "article_id": row.article_id,
            "title": row.title,
            "chunk_text": row.chunk_text,
            "similarity": float(row.similarity),
        }
        for row in rows
    ]


def assemble_context(chunks: list[dict]) -> tuple[str, list[dict]]:
    """Build a context string and deduplicated source list from retrieved chunks."""
    seen_articles: dict[int, str] = {}
    context_parts = []
    for chunk in chunks:
        aid = chunk["article_id"]
        if aid not in seen_articles:
            seen_articles[aid] = chunk["title"]
        context_parts.append(f"--- {chunk['title']} ---\n{chunk['chunk_text']}")

    context = "\n\n".join(context_parts)
    sources = [{"id": aid, "title": title} for aid, title in seen_articles.items()]
    return context, sources


async def stream_rag_answer(query: str, context: str) -> AsyncIterator[str]:
    """Stream a RAG answer from Ollama via SSE-compatible token chunks."""
    messages = [
        {"role": "system", "content": RAG_SYSTEM_PROMPT},
        {
            "role": "user",
            "content": f"Documentation context:\n\n{context}\n\n---\n\nQuestion: {query}",
        },
    ]
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream(
                "POST",
                f"{settings.ollama_url}/api/chat",
                json={
                    "model": settings.ollama_rag_model,
                    "messages": messages,
                    "stream": True,
                    "keep_alive": -1,
                },
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if not line.strip():
                        continue
                    try:
                        data = json.loads(line)
                        token = data.get("message", {}).get("content", "")
                        if token:
                            yield token
                        if data.get("done"):
                            break
                    except json.JSONDecodeError:
                        continue
    except httpx.HTTPError as e:
        logger.warning(f"Ollama streaming failed: {e}")
        yield "[AI search unavailable — Ollama could not be reached. Standard search results are shown above.]"
