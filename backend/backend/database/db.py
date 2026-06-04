from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
import os
from dotenv import load_dotenv

load_dotenv()

# Default to SQLite (zero-cost, no server needed).
# Set DATABASE_URL in .env to switch to PostgreSQL for production.
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./finmotion.db")

_sqlite = DATABASE_URL.startswith("sqlite")
_connect_args = {"check_same_thread": False} if _sqlite else {}

engine = create_engine(DATABASE_URL, connect_args=_connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
