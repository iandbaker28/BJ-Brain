import logging
import httpx
from ..core.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

CHUNK_SIZE = 512  # approximate tokens (characters / 4)
CHUNK_OVERLAP = 50


def chunk_text(text: str) -> list[str]:
    """Split text into overlapping chunks of approximately CHUNK_SIZE tokens."""
    char_size = CHUNK_SIZE * 4
    char_overlap = CHUNK_OVERLAP * 4
    chunks = []
    start = 0
    while start < len(text):
        end = start + char_size
        chunks.append(text[start:end])
        if end >= len(text):
            break
        start = end - char_overlap
    return chunks


async def generate_embedding(text: str) -> list[float] | None:
    """Call Ollama to generate an embedding vector for the given text."""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{settings.ollama_url}/api/embeddings",
                json={
                    "model": settings.ollama_embed_model,
                    "prompt": text,
                    "keep_alive": -1,
                },
            )
            response.raise_for_status()
            data = response.json()
            return data.get("embedding")
    except Exception as e:
        logger.warning(f"Embedding generation failed: {e}")
        return None


async def check_model_available(model: str) -> bool:
    """Check if a model is available on the Ollama host."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{settings.ollama_url}/api/tags")
            response.raise_for_status()
            models = [m["name"] for m in response.json().get("models", [])]
            return any(m.startswith(model.split(":")[0]) for m in models)
    except Exception as e:
        logger.warning(f"Could not reach Ollama to check model '{model}': {e}")
        return False
