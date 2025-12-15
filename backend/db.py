import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Ako postoji DATABASE_URL (Render / produkcija) → koristi nju
# Ako ne postoji → koristi lokalni SQLite
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./petnfc.db")

# SQLite zahteva check_same_thread=False, Postgres NE
connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()
