from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class FeedbackCreate(BaseModel):
    author_name: str = Field(min_length=1, max_length=80)
    message: str = Field(min_length=1, max_length=1000)

    @field_validator("author_name", "message", mode="before")
    @classmethod
    def strip_text(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value


class FeedbackResponse(BaseModel):
    id: int
    author_name: str
    message: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
