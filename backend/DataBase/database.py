from typing import Annotated, Generator
from fastapi import Depends
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker


DATABASE_URL = "postgresql+psycopg://aleksandr@localhost:5432/deathline_db"


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
