from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Application
    app_name: str = "JIG"
    app_version: str = "0.1.0"
    debug: bool = False
    secret_key: str = "change-me-in-production-min-32-chars"

    # Database
    database_url: str = "postgresql+asyncpg://jig:jig@localhost:5432/jig"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # Auth
    access_token_expire_minutes: int = 480  # 8 hours
    algorithm: str = "HS256"

    # AI engine — one of: "ollama" | "azure_openai"
    ai_provider: str = "ollama"

    # Ollama
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.2:3b"

    # Azure OpenAI
    azure_openai_endpoint: str = ""
    azure_openai_api_key: str = ""
    azure_openai_deployment: str = "gpt-4o"
    azure_openai_api_version: str = "2024-12-01-preview"

    # CORS — comma-separated origins
    cors_origins: str = "http://localhost:3000"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",")]


settings = Settings()
