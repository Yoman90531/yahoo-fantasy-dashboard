from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.feedback import Feedback
from app.schemas.feedback import FeedbackCreate, FeedbackResponse

router = APIRouter(prefix="/feedback", tags=["feedback"])


@router.get("", response_model=list[FeedbackResponse])
def list_feedback(
    limit: int = Query(100, ge=1, le=200),
    db: Session = Depends(get_db),
):
    return db.scalars(
        select(Feedback)
        .order_by(Feedback.created_at.desc(), Feedback.id.desc())
        .limit(limit)
    ).all()


@router.post(
    "",
    response_model=FeedbackResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_feedback(
    payload: FeedbackCreate,
    db: Session = Depends(get_db),
):
    post = Feedback(
        author_name=payload.author_name,
        message=payload.message,
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return post
