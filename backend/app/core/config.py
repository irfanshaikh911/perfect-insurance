from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(BACKEND_ROOT / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    data_dir: Path = BACKEND_ROOT / "lic_data"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    storage_dir: Path = BACKEND_ROOT / "storage"
    database_url: str = "sqlite:///./perfect_agent.db"
    secret_key: str = "perfect-agent-jwt-super-secret-key-lic-workspace-2026"
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 30

    @property
    def plans_dir(self) -> Path:
        return self.data_dir / "plans"

    @property
    def documents_file(self) -> Path:
        return self.data_dir / "documents.json"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
