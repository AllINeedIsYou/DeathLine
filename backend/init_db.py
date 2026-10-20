from DataBase.database import Base, engine
from DataBase import models
from config import DATABASE_URL_UNPOOLED
from sqlalchemy import create_engine
from sqlalchemy.engine import make_url


def initialize_database():
    if not DATABASE_URL_UNPOOLED:
        Base.metadata.create_all(bind=engine)
        return
    schema_engine = create_engine(make_url(DATABASE_URL_UNPOOLED).set(drivername="postgresql+psycopg"))
    try:
        Base.metadata.create_all(bind=schema_engine)
    finally:
        schema_engine.dispose()


if __name__ == "__main__":
    initialize_database()
