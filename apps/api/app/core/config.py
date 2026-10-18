from functools import lru_cache
from typing import Literal
from pydantic import SecretStr, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    falkordb_host: str = "localhost"
    falkordb_port: int = 6379
    falkordb_username: str = "default"
    falkordb_password: SecretStr
    falkordb_ssl: bool = False
    falkordb_graph: str = Field(default="opsgraph_dev", pattern=r"^opsgraph_[a-z0-9_]+$")
    api_token: SecretStr
    model_provider: Literal["none", "ollama", "google"] = "none"
    model_name: str = "qwen3.8:27b"
    ollama_base_url: str = "http://localhost:11434"
    google_api_key: SecretStr = SecretStr("")
    model_timeout_seconds: int = Field(default=45, ge=1, le=180)
    model_max_output_tokens: int = Field(default=700, ge=64, le=2048)


@lru_cache
def get_settings() -> Settings:
    return Settings()
