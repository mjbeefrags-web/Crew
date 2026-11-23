from functools import lru_cache
from typing import Literal

from pydantic import Field, SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Crewww API"
    app_env: Literal["local", "docker", "staging", "production"] = "local"
    debug: bool = False
    api_v1_prefix: str = "/api/v1"
    database_url: str = "sqlite+aiosqlite:///./crewww-dev.db"
    redis_url: str = ""
    redis_required: bool = False
    jwt_secret: SecretStr = SecretStr("local-development-secret-change-before-production")
    jwt_issuer: str = "crewww-api"
    access_token_minutes: int = Field(default=10, ge=2, le=60)
    refresh_token_days: int = Field(default=14, ge=1, le=60)
    frontend_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    cookie_secure: bool = False
    bootstrap_admin_email: str = ""
    bootstrap_admin_password: SecretStr | None = None
    payment_mode: Literal["mock"] = "mock"
    email_mode: Literal["console"] = "console"

    @property
    def allowed_origins(self) -> list[str]:
        return [origin.strip() for origin in self.frontend_origins.split(",") if origin.strip()]

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
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
