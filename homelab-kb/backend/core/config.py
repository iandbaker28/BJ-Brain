from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://kb:kb@db:5432/homelab_kb"
    ollama_url: str = "http://host.docker.internal:11434"
    ollama_embed_model: str = "nomic-embed-text"
    ollama_rag_model: str = "llama3.2:3b"
    jwt_secret: str = "change_this_to_a_long_random_string"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 480  # 8 hours — internal homelab tool
    refresh_token_expire_days: int = 7
    data_path: str = "/app/data"
    cors_origins: str = "*"
    ai_rate_limit_rpm: int = 20

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
