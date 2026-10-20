from DataBase.database import Base, engine
from DataBase import models


def initialize_database():
    Base.metadata.create_all(bind=engine)


if __name__ == "__main__":
    initialize_database()
