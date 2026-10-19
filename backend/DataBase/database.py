from config import DATABASE_URL as CONFIG_DATABASE_URL
from typing import Annotated, Generator
from fastapi import Depends
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker


DATABASE_URL = CONFIG_DATABASE_URL
if not DATABASE_URL:
    raise RuntimeError("Set DATABASE_URL in backend/.env before starting the API")


engine = create_engine(DATABASE_URL, echo=True)


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)



def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()



SessionDep = Annotated[Session, Depends(get_db)]



class Base(DeclarativeBase):
    pass
