from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    yahoo_client_id: str
    yahoo_client_secret: str
    league_id: str
    league_start_year: int = 2014
    database_url: str = "sqlite:///../data/fantasy.db"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
