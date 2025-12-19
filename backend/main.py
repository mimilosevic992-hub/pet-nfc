import os
import io
import csv
from datetime import date

from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse, StreamingResponse
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session
from sqlalchemy import text
from sqlalchemy.exc import ProgrammingError

import secrets
import string
from enum import Enum
from db import Base, engine, SessionLocal  # tvoj db.py
from models import Tag, TagStatus, Pet, PetStatus, OwnerProfile, User, HealthEntry, Reminder  # tvoj models.py
from auth import hash_password, verify_password, create_access_token, get_current_user
from typing import List, Optional

app = FastAPI(title="Pet NFC API")

# CORS (Vercel + local)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://pet-nfc.vercel.app",
        # dodaj ovde i preview domen ako ga koristiš
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

templates = Jinja2Templates(directory="templates")

# Kreira tabele prvi put
Base.metadata.create_all(bind=engine)

@app.on_event("startup")
def _auto_migrate_health_entries():
    # dodaj kolonu next_due ako ne postoji (Postgres)
    try:
        db = SessionLocal()
        db.execute(text("ALTER TABLE health_entries ADD COLUMN IF NOT EXISTS next_due VARCHAR"))
        db.commit()
    except Exception as e:
        # ne rušimo app ako je već ok
        try:
            db.rollback()
        except:
            pass
        print("Auto-migrate warning:", e)
    finally:
        try:
            db.close()
        except:
            pass

def ensure_health_entry_columns():
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE health_entries ADD COLUMN IF NOT EXISTS weight_kg VARCHAR"))
        conn.execute(text("ALTER TABLE health_entries ADD COLUMN IF NOT EXISTS dosage VARCHAR"))
        conn.execute(text("ALTER TABLE health_entries ADD COLUMN IF NOT EXISTS duration_days INTEGER"))

Base.metadata.create_all(bind=engine)
ensure_health_entry_columns()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def reminder_status(d: str) -> str:
    # d = "YYYY-MM-DD"
    try:
        y, m, dd = d.split("-")
        rd = date(int(y), int(m), int(dd))
    except Exception:
        return "upcoming"

    today = date.today()
    if rd < today:
        return "overdue"
    if rd == today:
        return "today"
    return "upcoming"


# =========================
# Schemas
# =========================

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str


class ActivateTagAuthRequest(BaseModel):
    tag_id: str


class CreatePetAuthRequest(BaseModel):
    tag_id: str
    name: str
    species: str
    birth_year: int = Field(..., ge=1900, le=2100)
    pedigree: bool = False


class OwnerProfileAuthRequest(BaseModel):
    phone: str
    city: str


class LostToggleAuthRequest(BaseModel):
    lost: bool

class AdminGenerateTagsRequest(BaseModel):
    prefix: str = "PET"
    start: int = 1
    count: int = 100

class AdminExportSelectedRequest(BaseModel):
    tag_ids: list[str]

class AdminTagIdsRequest(BaseModel):
    tag_ids: list[str]

class AdminMarkPrintedRequest(BaseModel):
    tag_ids: List[str]

class PetEditRequest(BaseModel):
    pedigree: bool

class HealthEntryCreateRequest(BaseModel):
    section: str  # VACCINATION | CHECKUP | THERAPY | ALLERGY | NOTE
    date: str     # "YYYY-MM-DD"
    title: str
    notes: str | None = None
    vet_name: str | None = None
    clinic: str | None = None

    # alergije (samo ako section == ALLERGY)
    allergen: str | None = None
    reaction: str | None = None

    next_due: str | None = None         # VACCINATIONS
    weight_kg: str | None = None        # CHECKUPS
    dosage: str | None = None           # TREATMENTS
    duration_days: int | None = None    # TREATMENTS


class ReminderCreateRequest(BaseModel):
    type: str  # VACCINE | CHECKUP | THERAPY
    date: str  # "YYYY-MM-DD"
    title: str
    notes: str | None = None


class ReminderCompleteRequest(BaseModel):
    section: Optional[str] = None
    date: str
    title: str
    notes: str | None = None
    vet_name: str | None = None
    clinic: str | None = None

    # ✅ dodatna polja po sekciji
    next_due: str | None = None         # VACCINATIONS
    weight_kg: str | None = None        # CHECKUPS
    dosage: str | None = None           # TREATMENTS
    duration_days: int | None = None    # TREATMENTS

# =========================
# Basic
# =========================

@app.get("/")
def root():
    return {"ok": True, "message": "Pet NFC backend radi!"}


@app.get("/health")
def health():
    return {"status": "healthy"}


# =========================
# Auth
# =========================

@app.post("/auth/register")
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email je već registrovan.")

    if len(payload.password) < 6:
        raise HTTPException(status_code=400, detail="Lozinka mora imati bar 6 karaktera.")

    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"ok": True, "email": user.email}


@app.post("/auth/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if user is None or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Pogrešan email ili lozinka.")

    token = create_access_token(user.email)
    return {"access_token": token, "token_type": "bearer"}


@app.get("/auth/me")
def me(current_user: User = Depends(get_current_user)):
    return {"email": current_user.email, "phone": current_user.phone, "city": current_user.city}

# =========================
# Admin 
# =========================

ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "").strip().lower()

def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    if not ADMIN_EMAIL or current_user.email.strip().lower() != ADMIN_EMAIL:
        raise HTTPException(status_code=403, detail="Admin only.")

    return current_user

ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # bez I,O,1,0 (lakše čitanje)

def make_tag_code(prefix: str, length: int = 12) -> str:
    rand = "".join(secrets.choice(ALPHABET) for _ in range(length))
    return f"{prefix}-{rand}"

class AdminGenerateTagsRequest(BaseModel):
    prefix: str = "PET"
    count: int = 100
    length: int = 12  # 12-16 je super

@app.post("/admin/tags/generate")
def admin_generate_tags(
    payload: AdminGenerateTagsRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    created = []
    attempts = 0
    max_attempts = payload.count * 20  # da ne upadnemo u beskonačnu petlju

    while len(created) < payload.count and attempts < max_attempts:
        attempts += 1
        tag_code = make_tag_code(payload.prefix, payload.length)

        exists = db.query(Tag).filter(Tag.tag_id == tag_code).first()
        if exists:
            continue

        t = Tag(tag_id=tag_code, status=TagStatus.FREE, owner_email=None)
        db.add(t)
        created.append(tag_code)

    db.commit()

    if len(created) < payload.count:
        raise HTTPException(status_code=500, detail="Nije uspelo generisanje dovoljno jedinstvenih tagova.")

    return {"created_count": len(created), "created": created}

@app.get("/admin/tags")
def admin_list_tags(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    tags = db.query(Tag).order_by(Tag.id.desc()).limit(2000).all()
    return [
        {
            "tag_id": t.tag_id,
            "status": t.status,
            "owner_email": t.owner_email,
        }
        for t in tags
    ]

@app.get("/admin/tags/export")
def admin_export_tags(
    status: str = "FREE",
    limit: int = 5000,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    # PUBLIC URL treba da bude FRONTEND domen (Vercel), ne Render
    site = os.getenv("PUBLIC_SITE_URL", "https://pet-nfc.vercel.app").rstrip("/")

    q = db.query(Tag)

    # filtriranje po statusu (npr FREE / ACTIVE / ASSIGNED / LOST_TAG)
    if status and status.upper() != "ALL":
        q = q.filter(Tag.status == status.upper())

    tags = q.order_by(Tag.id.asc()).limit(limit).all()

    out = io.StringIO()
    w = csv.writer(out)
    w.writerow(["tag_id", "public_url", "status"])

    for t in tags:
        w.writerow([t.tag_id, f"{site}/t/{t.tag_id}", t.status])

    csv_bytes = out.getvalue().encode("utf-8")

    filename = f"petnfc_tags_{status.lower()}.csv"
    return StreamingResponse(
        io.BytesIO(csv_bytes),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

@app.post("/admin/tags/export-selected")
def admin_export_selected_tags(
    payload: AdminExportSelectedRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    site = os.getenv("PUBLIC_SITE_URL", "https://pet-nfc.vercel.app").rstrip("/")

    # očisti i ukloni duplikate
    ids = []
    seen = set()
    for x in payload.tag_ids:
        if not x:
            continue
        s = x.strip()
        if not s:
            continue
        if s in seen:
            continue
        seen.add(s)
        ids.append(s)

    if not ids:
        raise HTTPException(status_code=400, detail="Nema izabranih tagova.")

    tags = (
        db.query(Tag)
        .filter(Tag.tag_id.in_(ids))
        .order_by(Tag.id.asc())
        .all()
    )

    # napravi mapu da export bude u istom redosledu kao selection
    found = {t.tag_id: t for t in tags}

    out = io.StringIO()
    w = csv.writer(out)
    w.writerow(["tag_id", "public_url", "status"])

    missing = []
    for tid in ids:
        t = found.get(tid)
        if not t:
            missing.append(tid)
            continue
        w.writerow([t.tag_id, f"{site}/t/{t.tag_id}", t.status])

    # Ako hoćeš strogo: da pukne ako ima missing
    # if missing:
    #     raise HTTPException(status_code=400, detail=f"Neki tagovi ne postoje: {missing}")

    csv_bytes = out.getvalue().encode("utf-8")
    filename = "petnfc_tags_selected.csv"
    return StreamingResponse(
        io.BytesIO(csv_bytes),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

@app.post("/admin/tags/mark-programmed")
def admin_mark_programmed(
    payload: AdminTagIdsRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    ids = list({(x or "").strip() for x in payload.tag_ids if (x or "").strip()})
    if not ids:
        raise HTTPException(status_code=400, detail="Nema izabranih tagova.")

    tags = db.query(Tag).filter(Tag.tag_id.in_(ids)).all()
    found_ids = {t.tag_id for t in tags}

    # menjamo samo FREE -> PROGRAMMED (ne diramo ACTIVE/ASSIGNED)
    updated = 0
    for t in tags:
        if t.status == TagStatus.FREE:
            t.status = TagStatus.PROGRAMMED
            updated += 1

    db.commit()
    return {
        "requested": len(ids),
        "found": len(found_ids),
        "updated": updated,
        "missing": [x for x in ids if x not in found_ids],
    }


@app.post("/admin/tags/unmark-programmed")
def admin_unmark_programmed(
    payload: AdminTagIdsRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    ids = list({(x or "").strip() for x in payload.tag_ids if (x or "").strip()})
    if not ids:
        raise HTTPException(status_code=400, detail="Nema izabranih tagova.")

    tags = db.query(Tag).filter(Tag.tag_id.in_(ids)).all()
    found_ids = {t.tag_id for t in tags}

    # vraćamo samo PROGRAMMED -> FREE
    updated = 0
    for t in tags:
        if t.status == TagStatus.PROGRAMMED:
            t.status = TagStatus.FREE
            updated += 1

    db.commit()
    return {
        "requested": len(ids),
        "found": len(found_ids),
        "updated": updated,
        "missing": [x for x in ids if x not in found_ids],
    }

@app.post("/admin/tags/mark_printed")
def admin_mark_printed(
    payload: AdminMarkPrintedRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    tag_ids = [t.strip() for t in payload.tag_ids if t and t.strip()]
    if not tag_ids:
        raise HTTPException(status_code=400, detail="Nema tagova.")

    tags = db.query(Tag).filter(Tag.tag_id.in_(tag_ids)).all()
    found = {t.tag_id for t in tags}
    missing = [t for t in tag_ids if t not in found]
    if missing:
        raise HTTPException(status_code=404, detail=f"Neki tagovi ne postoje: {missing[:10]}")

    # STRICT: samo PROGRAMMED -> PRINTED
    not_programmed = [t.tag_id for t in tags if t.status != TagStatus.PROGRAMMED]
    if not_programmed:
        raise HTTPException(
            status_code=400,
            detail=f"Samo PROGRAMMED tagovi mogu u PRINTED. Problem: {not_programmed[:10]}",
        )

    for t in tags:
        t.status = TagStatus.PRINTED

    db.commit()
    return {"updated_count": len(tags), "updated": [t.tag_id for t in tags]}



@app.get("/admin/tags/{tag_id}")
def admin_tag_detail(
    tag_id: str,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    tag = db.query(Tag).filter(Tag.tag_id == tag_id).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag ne postoji.")

    pet = db.query(Pet).filter(Pet.tag_id == tag.id).first()

    return {
        "tag_id": tag.tag_id,
        "status": tag.status,
        "owner_email": tag.owner_email,
        "pet": (
            {
                "pet_id": pet.id,
                "name": pet.name,
                "species": pet.species,
                "status": pet.status,
            }
            if pet
            else None
        ),
    }



@app.get("/admin/me")
def admin_me(admin: User = Depends(require_admin)):
    return {"email": admin.email}

# =========================
# Owner profile (auth)
# =========================

@app.post("/owner/profile_auth")
def upsert_profile_auth(
    payload: OwnerProfileAuthRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.email == current_user.email).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")

    user.phone = payload.phone
    user.city = payload.city
    db.add(user)
    db.commit()
    db.refresh(user)

    return {"email": user.email, "phone": user.phone, "city": user.city}


# =========================
# Tags (auth) — FREE -> ACTIVE
# =========================

@app.post("/tags/activate_auth")
def activate_tag_auth(
    payload: ActivateTagAuthRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    tag = db.query(Tag).filter(Tag.tag_id == payload.tag_id).first()
    if tag is None:
        raise HTTPException(status_code=404, detail="Tag ne postoji (nije u inventaru).")

    if tag.status != TagStatus.FREE:
        raise HTTPException(status_code=400, detail=f"Tag nije FREE (trenutno: {tag.status}).")

    tag.status = TagStatus.ACTIVE
    tag.owner_email = current_user.email
    db.commit()
    db.refresh(tag)

    return {"ok": True, "tag_id": tag.tag_id, "status": tag.status}


# =========================
# Pets (auth) — create + ASSIGN (lock identity)
# =========================

@app.post("/pets/create-and-assign_auth")
def create_pet_and_assign_auth(
    payload: CreatePetAuthRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    tag = db.query(Tag).filter(Tag.tag_id == payload.tag_id).first()
    if tag is None:
        raise HTTPException(status_code=404, detail="Tag ne postoji.")

    if tag.status != TagStatus.ACTIVE:
        raise HTTPException(status_code=400, detail=f"Tag mora biti ACTIVE (trenutno: {tag.status}).")

    if tag.owner_email != current_user.email:
        raise HTTPException(status_code=403, detail="Ovaj tag ne pripada ulogovanom korisniku.")

    existing_pet = db.query(Pet).filter(Pet.tag_id == tag.id).first()
    if existing_pet:
        raise HTTPException(status_code=400, detail="Ovaj tag je već dodeljen ljubimcu.")

    birth_date = date(payload.birth_year, 1, 1)

    pet = Pet(
        name=payload.name,
        species=payload.species,
        birth_date=birth_date,
        pedigree=payload.pedigree,
        status=PetStatus.ACTIVE,
        tag_id=tag.id,
        owner_email=current_user.email,
        # ako imaš identity_locked u modelu, stavi:
        # identity_locked=True,
    )

    tag.status = TagStatus.ASSIGNED

    db.add(pet)
    db.add(tag)
    db.commit()
    db.refresh(pet)

    return {"ok": True, "pet_id": pet.id, "tag_id": tag.tag_id, "tag_status": tag.status}



# =========================
# Pets (auth) — my pets list
# =========================

@app.get("/pets/my_auth")
def my_pets_auth(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    pets = db.query(Pet).filter(Pet.owner_email == current_user.email).all()

    out = []
    for p in pets:
        tag = db.query(Tag).filter(Tag.id == p.tag_id).first()
        out.append({
            "pet_id": p.id,
            "name": p.name,
            "species": p.species,
            "status": p.status,
            "tag_id": tag.tag_id if tag else None,
            "tag_status": tag.status if tag else None,
        })
    return out

@app.patch("/pets/{pet_id}/edit_auth")
def edit_pet_auth(
    pet_id: int,
    payload: PetEditRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    pet = db.query(Pet).filter(Pet.id == pet_id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Ljubimac ne postoji.")

    if pet.owner_email != current_user.email:
        raise HTTPException(status_code=403, detail="Nemaš pristup ovom ljubimcu.")

    # dozvoljavamo samo pedigree za sada
    pet.pedigree = payload.pedigree
    db.add(pet)
    db.commit()
    db.refresh(pet)

    return {"ok": True, "pet_id": pet.id, "pedigree": bool(getattr(pet, "pedigree", False))}

@app.get("/pets/{pet_id}")
def get_pet_detail_auth(
    pet_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    pet = db.query(Pet).filter(Pet.id == pet_id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Ljubimac ne postoji.")

    # sigurnost: samo vlasnik
    if pet.owner_email != current_user.email:
        raise HTTPException(status_code=403, detail="Nemaš pristup ovom ljubimcu.")

    tag = db.query(Tag).filter(Tag.id == pet.tag_id).first() if pet.tag_id else None

    birth = pet.birth_date
    if birth is None:
        birth_out = None
    elif isinstance(birth, str):
        birth_out = birth
    else:
        birth_out = birth.isoformat()

    return {
        "pet_id": pet.id,
        "name": pet.name,
        "species": pet.species,
        "birth_date": birth_out,
        "pedigree": bool(getattr(pet, "pedigree", False)),
        "status": pet.status,
        "tag_id": tag.tag_id if tag else None,
        "tag_status": tag.status if tag else None,
    }


# =========================
# Pets (auth) — lost toggle
# =========================

@app.post("/pets/{pet_id}/lost_auth")
def set_lost_status_auth(
    pet_id: int,
    payload: LostToggleAuthRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    pet = db.query(Pet).filter(Pet.id == pet_id).first()
    if pet is None:
        raise HTTPException(status_code=404, detail="Pet ne postoji.")

    if pet.owner_email != current_user.email:
        raise HTTPException(status_code=403, detail="Nisi vlasnik ovog ljubimca.")

    tag = db.query(Tag).filter(Tag.id == pet.tag_id).first()
    if tag is None:
        raise HTTPException(status_code=500, detail="Tag nije pronađen za ovog ljubimca.")

    if payload.lost:
        pet.status = PetStatus.LOST
        tag.status = TagStatus.LOST_TAG
    else:
        pet.status = PetStatus.ACTIVE
        tag.status = TagStatus.ASSIGNED

    db.add(pet)
    db.add(tag)
    db.commit()
    db.refresh(pet)

    return {
        "pet_id": pet.id,
        "pet_status": pet.status,
        "tag_id": tag.tag_id,
        "tag_status": tag.status,
    }

# =========================
# Health card (auth)
# =========================

@app.get("/pets/{pet_id}/health_auth")
def list_health_entries_auth(
    pet_id: int,
    section: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    pet = db.query(Pet).filter(Pet.id == pet_id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Ljubimac ne postoji.")
    if pet.owner_email != current_user.email:
        raise HTTPException(status_code=403, detail="Nemaš pristup ovom ljubimcu.")

    q = db.query(HealthEntry).filter(HealthEntry.pet_id == pet_id)
    if section:
        q = q.filter(HealthEntry.section == section.strip().upper())

    items = q.order_by(HealthEntry.date.desc(), HealthEntry.id.desc()).limit(2000).all()
    return [
        {
            "id": e.id,
            "section": e.section,
            "date": e.date,
            "title": e.title,
            "notes": e.notes,
            "vet_name": e.vet_name,
            "clinic": e.clinic,

            # ✅ dodatna polja
            "next_due": e.next_due,
            "weight_kg": e.weight_kg,
            "dosage": e.dosage,
            "duration_days": e.duration_days,

            "source_reminder_id": e.source_reminder_id,
            "created_at": e.created_at.isoformat() if e.created_at else None,
        }
        for e in items
        ]


@app.post("/pets/{pet_id}/health_auth")
def create_health_entry_auth(
    pet_id: int,
    payload: HealthEntryCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    pet = db.query(Pet).filter(Pet.id == pet_id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Ljubimac ne postoji.")
    if pet.owner_email != current_user.email:
        raise HTTPException(status_code=403, detail="Nemaš pristup ovom ljubimcu.")

    section = payload.section.strip().upper()

    if section == "ALLERGY":
        # alergije su statične i ne potiču iz podsetnika
        entry = HealthEntry(
            pet_id=pet_id,
            section=section,
            date=payload.date,
            title=payload.title,
            notes=payload.notes,
            vet_name=payload.vet_name,
            clinic=payload.clinic,
            allergen=payload.allergen,
            reaction=payload.reaction,
            source_reminder_id=None,
        )
    else:
        entry = HealthEntry(
            pet_id=pet_id,
            section=section,
            date=payload.date,
            title=payload.title,
            notes=payload.notes,
            vet_name=payload.vet_name,
            clinic=payload.clinic,
            allergen=None,
            reaction=None,
            source_reminder_id=None,
        )
    if section == "VACCINATIONS":
        entry.next_due = payload.next_due
    elif section == "CHECKUPS":
        entry.weight_kg = payload.weight_kg
    elif section == "TREATMENTS":
        entry.dosage = payload.dosage
        entry.duration_days = payload.duration_days

    db.add(entry)
    db.commit()
    db.refresh(entry)
    return {"ok": True, "id": entry.id}


@app.delete("/health/{entry_id}_auth")
def delete_health_entry_auth(
    entry_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    entry = db.query(HealthEntry).filter(HealthEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Zapis ne postoji.")

    pet = db.query(Pet).filter(Pet.id == entry.pet_id).first()
    if not pet or pet.owner_email != current_user.email:
        raise HTTPException(status_code=403, detail="Nemaš pristup.")

    db.delete(entry)
    db.commit()
    return {"ok": True}


# =========================
# Reminders (auth)
# =========================

@app.get("/pets/{pet_id}/reminders_auth")
def list_reminders_auth(
    pet_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    pet = db.query(Pet).filter(Pet.id == pet_id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Ljubimac ne postoji.")
    if pet.owner_email != current_user.email:
        raise HTTPException(status_code=403, detail="Nemaš pristup ovom ljubimcu.")

    items = db.query(Reminder).filter(Reminder.pet_id == pet_id).order_by(Reminder.date.asc(), Reminder.id.asc()).all()

    return [
        {
            "id": r.id,
            "pet_id": r.pet_id,
            "type": r.type,
            "date": r.date,
            "title": r.title,
            "notes": r.notes,
            "status": reminder_status(r.date),
        }
        for r in items
    ]


@app.post("/pets/{pet_id}/reminders_auth")
def create_reminder_auth(
    pet_id: int,
    payload: ReminderCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    pet = db.query(Pet).filter(Pet.id == pet_id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Ljubimac ne postoji.")
    if pet.owner_email != current_user.email:
        raise HTTPException(status_code=403, detail="Nemaš pristup ovom ljubimcu.")

    rtype = payload.type.strip().upper()
    if rtype not in ["VACCINE", "CHECKUP", "THERAPY"]:
        raise HTTPException(status_code=400, detail="Nepoznat tip podsetnika.")

    r = Reminder(
        pet_id=pet_id,
        type=rtype,
        date=payload.date,
        title=payload.title,
        notes=payload.notes,
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    return {"ok": True, "id": r.id}


@app.post("/reminders/{reminder_id}/complete_auth")
def complete_reminder_auth(
    reminder_id: int,
    payload: ReminderCompleteRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    r = db.query(Reminder).filter(Reminder.id == reminder_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Podsetnik ne postoji.")

    pet = db.query(Pet).filter(Pet.id == r.pet_id).first()
    if not pet or pet.owner_email != current_user.email:
        raise HTTPException(status_code=403, detail="Nemaš pristup.")

    SECTION_BY_TYPE = {
        "VACCINE": "VACCINATIONS",
        "CHECKUP": "CHECKUPS",
        "THERAPY": "TREATMENTS",
    }
    rt = (r.type or "").strip().upper()
    section = SECTION_BY_TYPE.get(rt)
    if not section:
        raise HTTPException(status_code=400, detail=f"Nepoznat tip podsetnika: {r.type}")

    # alergije nikad iz podsetnika
    if payload.section and payload.section.strip().upper() == "ALLERGY":
        raise HTTPException(status_code=400, detail="Alergije ne mogu nastati iz podsetnika.")

    # (soft) ignorišemo payload.section ako se ne slaže
    if payload.section:
        sent = payload.section.strip().upper()
        if sent != section:
            pass

    entry = HealthEntry(
        pet_id=r.pet_id,
        section=section,
        date=payload.date,
        title=payload.title,
        notes=payload.notes,
        vet_name=payload.vet_name,
        clinic=payload.clinic,
        allergen=None,
        reaction=None,
        source_reminder_id=r.id,
    )

    # ✅ upis dodatnih polja po sekciji
    if section == "VACCINATIONS":
        entry.next_due = payload.next_due

    elif section == "CHECKUPS":
        entry.weight_kg = payload.weight_kg

    elif section == "TREATMENTS":
        entry.dosage = payload.dosage
        entry.duration_days = payload.duration_days

    db.add(entry)
    db.delete(r)
    db.commit()
    db.refresh(entry)

    return {"ok": True, "health_entry_id": entry.id, "section": section}

@app.delete("/reminders/{reminder_id}_auth")
def delete_reminder_auth(
    reminder_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    r = db.query(Reminder).filter(Reminder.id == reminder_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Podsetnik ne postoji.")

    pet = db.query(Pet).filter(Pet.id == r.pet_id).first()
    if not pet or pet.owner_email != current_user.email:
        raise HTTPException(status_code=403, detail="Nemaš pristup.")

    db.delete(r)
    db.commit()
    return {"ok": True}


# =========================
# Public tag view (SAFE/LOST)
# =========================

@app.get("/api/t/{tag_id}")
def public_tag_view(tag_id: str, db: Session = Depends(get_db)):
    tag = db.query(Tag).filter(Tag.tag_id == tag_id).first()
    if tag is None:
        return {"state": "UNKNOWN", "message": "Tag nije pronađen."}
    
    if tag.status == TagStatus.FREE:
        return {
            "state": "UNACTIVATED",
            "message": "Ovaj Pet NFC tag još nije aktiviran.",
            "cta": "Vlasnik? Uloguj se i aktiviraj tag."
        }

    # ako postoji REMOVED u tvom TagStatus, ostavi:
    if hasattr(TagStatus, "REMOVED") and tag.status == TagStatus.REMOVED:
        return {"state": "REMOVED", "message": "Ovaj tag nije aktivan."}

    pet = db.query(Pet).filter(Pet.tag_id == tag.id).first()
    if pet is None:
        return {"state": "UNASSIGNED", "message": "Tag je aktivan, ali nije dodeljen ljubimcu."}

    if pet.status == PetStatus.DECEASED:
        return {
            "state": "DECEASED",
            "pet": {"name": pet.name, "species": pet.species},
            "message": "Ljubimac je označen kao preminuo.",
        }

    if pet.status == PetStatus.ACTIVE:
        return {
            "state": "SAFE",
            "pet": {"name": pet.name, "species": pet.species},
            "message": "Ljubimac nije prijavljen kao izgubljen.",
        }

    if pet.status == PetStatus.LOST:
        owner = db.query(User).filter(User.email == pet.owner_email).first()
        contact = {"owner_email": pet.owner_email}
        if owner:
            contact["phone"] = owner.phone
            contact["city"] = owner.city

        return {
            "state": "LOST",
            "pet": {"name": pet.name, "species": pet.species},
            "contact": contact,
            "cta": "Kontaktiraj vlasnika",
        }

@app.get("/t/{tag_id}/state")
def tag_state(tag_id: str, db: Session = Depends(get_db)):
    tag = db.query(Tag).filter(Tag.tag_id == tag_id).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag ne postoji.")

    # 1) FREE => nije aktiviran
    if tag.status == TagStatus.FREE:
        return {
            "state": "UNACTIVATED",
            "message": "Ovaj tag nije aktiviran. Vlasnik treba da ga aktivira u aplikaciji.",
        }

    # 2) ACTIVE => aktiviran ali još nema ljubimca
    if tag.status == TagStatus.ACTIVE:
        return {
            "state": "UNASSIGNED",
            "message": "Tag je aktiviran, ali ljubimac još nije dodat.",
        }

    # 3) ASSIGNED => ima ljubimca
    pet = db.query(Pet).filter(Pet.tag_id == tag.id).first()
    if not pet:
        # sigurnosna mreža (ako je stanje nekonzistentno)
        return {"state": "UNKNOWN", "message": "Tag je u sistemu, ali nije vezan za ljubimca."}

    # vlasnik (kontakt) iz users tabele (po email-u)
    owner = db.query(User).filter(User.email == pet.owner_email).first()

    if pet.status == PetStatus.LOST:
        return {
            "state": "LOST",
            "pet": {"name": pet.name, "species": pet.species},
            "contact": {
                "owner_email": owner.email if owner else pet.owner_email,
                "phone": owner.phone if owner else None,
                "city": owner.city if owner else None,
            },
            "cta": "Kontaktiraj vlasnika",
        }

    return {
        "state": "SAFE",
        "pet": {"name": pet.name, "species": pet.species},
        "message": "Ljubimac nije prijavljen kao izgubljen.",
    }

@app.get("/t/{tag_id}", response_class=HTMLResponse)
def public_tag_page(tag_id: str, request: Request, db: Session = Depends(get_db)):
    data = public_tag_view(tag_id=tag_id, db=db)
    return templates.TemplateResponse(
        "tag.html",
        {
            "request": request,
            "state": data.get("state"),
            "message": data.get("message"),
            "pet": data.get("pet"),
            "contact": data.get("contact"),
        },
    )
