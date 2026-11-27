from app.core.config import Settings


def test_neon_urls_are_normalized_and_split(monkeypatch):
    monkeypatch.setenv(
        "DATABASE_URL",
        "postgresql://user:pass@ep-test-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require",
    )
    monkeypatch.setenv(
        "DATABASE_URL_UNPOOLED",
        "postgres://user:pass@ep-test.us-east-2.aws.neon.tech/neondb?sslmode=require",
    )

    settings = Settings(_env_file=None)

    assert settings.database_url == (
        "postgresql+asyncpg://user:pass@ep-test-pooler.us-east-2.aws.neon.tech/neondb"
        "?sslmode=require"
    )
    assert settings.migration_database_url == (
        "postgresql+asyncpg://user:pass@ep-test.us-east-2.aws.neon.tech/neondb"
        "?sslmode=require"
    )


def test_migration_url_falls_back_to_pooled_url(monkeypatch):
    monkeypatch.setenv(
        "DATABASE_URL",
        "postgresql://user:pass@ep-test-pooler.us-east-2.aws.neon.tech/neondb",
    )
    monkeypatch.delenv("DATABASE_URL_UNPOOLED", raising=False)

    settings = Settings(_env_file=None)

    assert settings.migration_database_url == settings.database_url
