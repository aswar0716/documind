from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # LLM
    llm_provider: str = "openai"
    llm_model: str = "gpt-4o-mini"
    openai_api_key: str = ""
    anthropic_api_key: str = ""

    # Embeddings
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"

    # Vector store
    chroma_db_path: str = "./chroma_db"

    # File upload
    upload_dir: str = "./uploads"
    max_upload_size_mb: int = 50

    # MLflow
    mlflow_tracking_uri: str = "http://localhost:5000"
    mlflow_experiment_name: str = "documind-rag"

    # App
    app_env: str = "development"
    log_level: str = "INFO"


settings = Settings()
