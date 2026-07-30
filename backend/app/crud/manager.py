from sqlalchemy.orm import Session
from sqlalchemy.dialects.sqlite import insert
from app.models.manager import Manager
from app.services.manager_names import resolve_manager_name


def upsert_manager(db: Session, yahoo_guid: str, display_name: str, nickname: str | None = None) -> Manager:
    display_name = resolve_manager_name(yahoo_guid, display_name)
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
    managers = db.query(Manager).filter(~Manager.yahoo_guid.like("hidden_%")).all()
    for manager in managers:
        manager.display_name = resolve_manager_name(
            manager.yahoo_guid,
            manager.display_name,
        )
    return sorted(
        (
            manager for manager in managers
            if "hidden" not in manager.display_name.lower()
        ),
        key=lambda manager: manager.display_name,
    )


def get_by_id(db: Session, manager_id: int) -> Manager | None:
    manager = db.query(Manager).filter(Manager.id == manager_id).first()
    if manager:
        manager.display_name = resolve_manager_name(
            manager.yahoo_guid,
            manager.display_name,
        )
    return manager
