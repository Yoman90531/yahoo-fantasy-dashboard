from sqlalchemy.orm import Session
from sqlalchemy.dialects.sqlite import insert
from app.models.manager import Manager


def upsert_manager(db: Session, yahoo_guid: str, display_name: str, nickname: str | None = None) -> Manager:
    stmt = (
        insert(Manager)
        .values(yahoo_guid=yahoo_guid, display_name=display_name, nickname=nickname)
        .on_conflict_do_update(
            index_elements=["yahoo_guid"],
            set_={"display_name": display_name},
        )
    )
    db.execute(stmt)
    db.flush()
    return db.query(Manager).filter(Manager.yahoo_guid == yahoo_guid).one()


def get_all(db: Session) -> list[Manager]:
    return db.query(Manager).order_by(Manager.display_name).all()


def get_by_id(db: Session, manager_id: int) -> Manager | None:
    return db.query(Manager).filter(Manager.id == manager_id).first()
