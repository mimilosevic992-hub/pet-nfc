import enum
from sqlalchemy import Column, Integer, String, Enum, DateTime, func, ForeignKey
from sqlalchemy.orm import relationship
from db import Base

class TagStatus(str, enum.Enum):
    FREE = "FREE"
    ACTIVE = "ACTIVE"
    ASSIGNED = "ASSIGNED"
    LOST_TAG = "LOST_TAG"
    REMOVED = "REMOVED"

class Tag(Base):
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, index=True)
    tag_id = Column(String, unique=True, index=True, nullable=False)

    status = Column(Enum(TagStatus), nullable=False, default=TagStatus.FREE)

    # Za MVP: owner_email direktno (kasnije pravimo Users tabelu + FK)
    owner_email = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

class PetStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    LOST = "LOST"
    DECEASED = "DECEASED"

class Pet(Base):
    __tablename__ = "pets"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(String, nullable=False)
    species = Column(String, nullable=False)
    birth_date = Column(String, nullable=False)
    pedigree = Column(String, nullable=True)

    status = Column(Enum(PetStatus), nullable=False, default=PetStatus.ACTIVE)

    tag_id = Column(Integer, ForeignKey("tags.id"), unique=True, nullable=False)
    tag = relationship("Tag")

    owner_email = Column(String, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class OwnerProfile(Base):
    __tablename__ = "owner_profiles"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)

    phone = Column(String, nullable=False)
    city = Column(String, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)

    password_hash = Column(String, nullable=False)

    phone = Column(String, nullable=True)
    city = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
