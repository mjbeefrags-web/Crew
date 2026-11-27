from functools import lru_cache
from typing import Literal
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

from pydantic import Field, SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"), env_file_encoding="utf-8", extra="ignore"
    )

    app_name: str = "Crewww API"
    app_env: Literal["local", "docker", "staging", "production"] = "local"
    debug: bool = False
    api_v1_prefix: str = "/api/v1"
    database_url: str = "sqlite+aiosqlite:///./crewww-dev.db"
    # Neon writes the pooled URL to DATABASE_URL and the direct URL to
    # DATABASE_URL_UNPOOLED. Migrations use the direct connection.
    database_url_unpooled: str = ""
    db_pool_size: int = Field(default=10, ge=1, le=100)
    db_max_overflow: int = Field(default=20, ge=0, le=200)
    db_pool_recycle_seconds: int = Field(default=1800, ge=60)
    db_pool_timeout_seconds: int = Field(default=30, ge=1)
    db_echo: bool = False
    redis_url: str = ""
    redis_required: bool = False
    jwt_secret: SecretStr = SecretStr("local-development-secret-change-before-production")
    jwt_issuer: str = "crewww-api"
    access_token_minutes: int = Field(default=10, ge=2, le=60)
    refresh_token_days: int = Field(default=14, ge=1, le=60)
    frontend_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    cookie_secure: bool = False
    # Trust X-Forwarded-For / X-Real-IP for rate limiting when the API sits
    # behind our own Nginx or a known edge proxy. Never enable for a directly
    # exposed API, where clients could spoof the header.
    trust_proxy_headers: bool = False
    bootstrap_admin_email: str = ""
    bootstrap_admin_password: SecretStr | None = None
    payment_mode: Literal["mock"] = "mock"
    email_mode: Literal["console"] = "console"
    # Optional advisor. `local` needs no keys and is the safe default; `openai`
    # uses any OpenAI-compatible chat completions endpoint when configured.
    ai_provider: Literal["local", "openai"] = "local"
    ai_api_url: str = ""
    ai_api_key: SecretStr | None = None
    ai_model: str = "gpt-4o-mini"

    @field_validator("database_url", "database_url_unpooled", mode="before")
    @classmethod
    def normalize_asyncpg_url(cls, value: str | None) -> str | None:
        """Accept Neon's postgres:// strings with SQLAlchemy's asyncpg driver."""
        if not value:
            return value
        for scheme in ("postgres://", "postgresql://"):
            if value.startswith(scheme):
                value = f"postgresql+asyncpg://{value[len(scheme) :]}"
                break
        parsed = urlparse(value)
        if parsed.scheme == "postgresql+asyncpg" and parsed.query:
            # Neon's libpq-style params need translating for asyncpg:
            # channel_binding is unsupported; sslmode becomes ssl.
            query: list[tuple[str, str]] = []
            for key, val in parse_qsl(parsed.query, keep_blank_values=True):
                if key == "channel_binding":
                    continue
                if key == "sslmode":
                    key = "ssl"
                query.append((key, val))
            value = urlunparse(parsed._replace(query=urlencode(query)))
        return value

    @property
    def allowed_origins(self) -> list[str]:
        return [origin.strip() for origin in self.frontend_origins.split(",") if origin.strip()]

    @property
    def migration_database_url(self) -> str:
        """Use Neon's direct URL for DDL; fall back to the pooled URL."""
        return self.database_url_unpooled or self.database_url

    @model_validator(mode="after")
    def production_safety(self) -> "Settings":
        if self.app_env in {"staging", "production"}:
            if (
                len(self.jwt_secret.get_secret_value()) < 40
                or "change-before" in self.jwt_secret.get_secret_value()
            ):
                raise ValueError(
                    "JWT_SECRET must be unique, random, and at least 40 characters long "
                    "in staging and production"
                )
            if not self.database_url.startswith("postgresql+asyncpg://"):
                raise ValueError(
                    "DATABASE_URL must use PostgreSQL with asyncpg in staging and production"
                )
            if not self.cookie_secure:
                raise ValueError("COOKIE_SECURE must be true in staging and production")
            if not self.redis_required or not self.redis_url:
                raise ValueError(
                    "REDIS_URL must be configured and REDIS_REQUIRED must be true "
                    "in staging and production"
                )
            if self.bootstrap_admin_password is not None:
                if self.bootstrap_admin_password.get_secret_value():
                    raise ValueError(
                        "Remove BOOTSTRAP_ADMIN_PASSWORD after the first admin account is created"
                    )
            if self.debug:
                raise ValueError("DEBUG must be false in staging and production")
            if "*" in self.allowed_origins:
                raise ValueError(
                    "FRONTEND_ORIGINS must not contain a wildcard in staging or production"
                )
        if self.redis_required and not self.redis_url:
            raise ValueError("REDIS_URL is required when REDIS_REQUIRED is true")
        if self.ai_provider == "openai" and (
            not self.ai_api_url
            or self.ai_api_key is None
            or not self.ai_api_key.get_secret_value()
        ):
            raise ValueError(
                "AI_API_URL and AI_API_KEY are required when AI_PROVIDER is 'openai'"
            )
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
