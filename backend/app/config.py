from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # SQLite por defecto para desarrollo local; en producción definir
    # DATABASE_URL=postgresql+psycopg2://user:pass@host/dbname en .env
    database_url: str = "sqlite:///./dm2.db"
    secret_key: str = "dev-secret-cambiar-en-produccion"
    algorithm: str = "HS256"
    access_token_expire_hours: int = 24
    cors_origins: list[str] = ["http://localhost:8000", "http://127.0.0.1:8000"]

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
