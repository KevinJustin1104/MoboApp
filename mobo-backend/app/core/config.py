from pydantic import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./mobodb.sqlite"
    SECRET_KEY: str = "mydefaultsecretkey"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30 * 10080  # 30 days

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
