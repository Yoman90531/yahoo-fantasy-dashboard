from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DATABASE_URL = f"sqlite:///{(PROJECT_ROOT / 'data' / 'fantasy.db').as_posix()}"


class Settings(BaseSettings):
    yahoo_client_id: str = ""
    yahoo_client_secret: str = ""
    league_id: str = ""
    league_start_year: int = 2014
    database_url: str = DEFAULT_DATABASE_URL

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    def require_yahoo_credentials(self) -> None:
        missing = [
            name
            for name, value in (
                ("YAHOO_CLIENT_ID", self.yahoo_client_id),
                ("YAHOO_CLIENT_SECRET", self.yahoo_client_secret),
                ("LEAGUE_ID", self.league_id),
            )
            if not value
        ]
        if missing:
            raise RuntimeError(f"Missing Yahoo configuration: {', '.join(missing)}")


settings = Settings()
