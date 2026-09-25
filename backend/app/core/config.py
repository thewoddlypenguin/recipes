from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings, loaded from environment variables (or backend/.env)."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database
    database_url: str = "sqlite:///./dev.db"

    # Auth
    secret_key: str = "dev-secret-change-me"
    access_token_expire_minutes: int = 1440

    # Uploads
    upload_dir: str = "./uploads"
    public_upload_url: str = "/uploads"

    # Seed admin (used by app.seed.seed_data)
    initial_admin_email: str = "justin@example.com"
    initial_admin_password: str = "change-me"

    # CORS: comma-separated list of allowed origins
    cors_origins: str = "http://localhost:5173,http://localhost:8080"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()