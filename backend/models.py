import enum
from sqlalchemy import Column, Integer, String, Enum, DateTime, func, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship
from db import Base



class TagStatus(str, enum.Enum):
    FREE = "FREE"
    ACTIVE = "ACTIVE"
    ASSIGNED = "ASSIGNED"
    PROGRAMMED = "PROGRAMMED"
    PRINTED = "PRINTED"
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
    is_breeding = Column(Boolean, nullable=False, default=False)
    sex = Column(String, nullable=False, default="UNKNOWN")      # MALE/FEMALE/UNKNOWN
    breed = Column(String, nullable=True)                        # rasa (opciono)
    is_neutered = Column(String, nullable=False, default="UNKNOWN")  # YES/NO/UNKNOWN
    notes = Column(String, nullable=True)  

    tag_id = Column(Integer, ForeignKey("tags.id"), unique=True, nullable=False)
    tag = relationship("Tag")

    owner_email = Column(String, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    avatar_mime = Column(String, nullable=True)  # npr "image/jpeg"
    avatar_data = Column(Text, nullable=True)    # base64 string

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
    
class HealthEntry(Base):
    __tablename__ = "health_entries"

    id = Column(Integer, primary_key=True, index=True)

    # vlasnik kroz Pet (auth proverava da li pet.owner_email == current_user.email)
    pet_id = Column(Integer, ForeignKey("pets.id"), index=True, nullable=False)
    pet = relationship("Pet")

    # Sekcije: VACCINATION | CHECKUP | THERAPY | ALLERGY | NOTE
    section = Column(String, nullable=False)

    # datum zapisa (YYYY-MM-DD kao string, jer i Pet.birth_date ti je string)
    date = Column(String, nullable=False)

    # univerzalno: naslov + opis
    title = Column(String, nullable=False)
    notes = Column(String, nullable=True)

    # opcioni “zajednički” podaci
    vet_name = Column(String, nullable=True)
    clinic = Column(String, nullable=True)

    # Alergije (samo ovde, statično, bez podsetnika)
    allergen = Column(String, nullable=True)
    reaction = Column(String, nullable=True)

    next_due = Column(String, nullable=True)      # ✅ VACCINATIONS
    weight_kg = Column(String, nullable=True)     # CHECKUPS
    dosage = Column(String, nullable=True)        # TREATMENTS
    duration_days = Column(Integer, nullable=True)# TREATMENTS

    # ako je nastalo iz podsetnika (za ALLERGY mora ostati NULL)
    source_reminder_id = Column(
    Integer,
    ForeignKey("reminders.id", ondelete="SET NULL"),
    nullable=True,
)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class Reminder(Base):
    __tablename__ = "reminders"

    id = Column(Integer, primary_key=True, index=True)

    pet_id = Column(Integer, ForeignKey("pets.id"), index=True, nullable=False)
    pet = relationship("Pet")

    # Tipovi: VACCINE | CHECKUP | THERAPY
    type = Column(String, nullable=False)

    # datum podsetnika (YYYY-MM-DD)
    date = Column(String, nullable=False)

    title = Column(String, nullable=False)
    notes = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class TagScan(Base):
    __tablename__ = "tag_scans"

    id = Column(Integer, primary_key=True, index=True)

    pet_id = Column(Integer, ForeignKey("pets.id"), index=True, nullable=False)
    pet = relationship("Pet")

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # da li je ljubimac bio LOST u trenutku skeniranja
    is_lost = Column(Boolean, nullable=False, default=False)

    # opciono (korisno za admin kasnije)
    ip = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
