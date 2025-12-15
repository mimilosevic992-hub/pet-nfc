from fastapi import FastAPI, Depends, HTTPException, Request
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm


from db import Base, engine, SessionLocal
from models import Tag, TagStatus, Pet, PetStatus, OwnerProfile, User
from auth import hash_password, verify_password, create_access_token, get_current_user

app = FastAPI(title="Pet NFC API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://pet-bmlywpedh-milos-projects-cf3a85f2.vercel.app",
        ]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    
)

templates = Jinja2Templates(directory="templates")

# Kreira tabele u SQLite (petnfc.db) prvi put kad se app pokrene
Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class ActivateTagRequest(BaseModel):
    tag_id: str
    owner_email: EmailStr

class CreatePetRequest(BaseModel):
    tag_id: str
    owner_email: EmailStr
    name: str
    species: str
    birth_date: str
    pedigree: str | None = None

class LostToggleRequest(BaseModel):
    owner_email: EmailStr
    lost: bool

class OwnerProfileRequest(BaseModel):
    email: EmailStr
    phone: str
    city: str

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class ActivateTagAuthRequest(BaseModel):
    tag_id: str

class CreatePetAuthRequest(BaseModel):
    tag_id: str
    name: str
    species: str
    birth_date: str
    pedigree: str | None = None

class OwnerProfileAuthRequest(BaseModel):
    phone: str
    city: str



@app.get("/")
def root():
    return {"ok": True, "message": "Pet NFC backend radi!"}

@app.get("/health")
def health():
    return {"status": "healthy"}

@app.post("/tags/activate")
def activate_tag(payload: ActivateTagRequest, db: Session = Depends(get_db)):
    """
    Pravilo: FREE -> ACTIVE i vezuje se za owner_email.
    Ako tag ne postoji: kreiramo ga kao FREE, pa ga aktiviramo odmah (za razvoj/test).
    """
    tag = db.query(Tag).filter(Tag.tag_id == payload.tag_id).first()

    if tag is None:
        tag = Tag(tag_id=payload.tag_id, status=TagStatus.FREE)
        db.add(tag)
        db.commit()
        db.refresh(tag)

    if tag.status != TagStatus.FREE:
        raise HTTPException(status_code=400, detail=f"Tag nije FREE (trenutno: {tag.status}).")

    tag.status = TagStatus.ACTIVE
    tag.owner_email = payload.owner_email
    db.add(tag)
    db.commit()
    db.refresh(tag)

    return {
        "tag_id": tag.tag_id,
        "status": tag.status,
        "owner_email": tag.owner_email,
    }

@app.get("/tags/my")
def my_tags(owner_email: EmailStr, db: Session = Depends(get_db)):
    """
    Lista tagova za dati email (privremeno).
    """
    tags = db.query(Tag).filter(Tag.owner_email == owner_email).all()
    return [
        {"tag_id": t.tag_id, "status": t.status, "owner_email": t.owner_email}
        for t in tags
    ]

@app.post("/pets/create-and-assign")
def create_pet_and_assign(payload: CreatePetRequest, db: Session = Depends(get_db)):
    tag = db.query(Tag).filter(Tag.tag_id == payload.tag_id).first()

    if tag is None:
        raise HTTPException(status_code=404, detail="Tag ne postoji.")

    if tag.status != TagStatus.ACTIVE:
        raise HTTPException(
            status_code=400,
            detail=f"Tag mora biti ACTIVE (trenutno: {tag.status})."
        )

    pet = Pet(
        name=payload.name,
        species=payload.species,
        birth_date=payload.birth_date,
        pedigree=payload.pedigree,
        tag_id=tag.id,
        owner_email=payload.owner_email,
        status=PetStatus.ACTIVE,
    )

    tag.status = TagStatus.ASSIGNED

    db.add(pet)
    db.add(tag)
    db.commit()
    db.refresh(pet)

    return {
        "pet_id": pet.id,
        "name": pet.name,
        "status": pet.status,
        "tag_status": tag.status,
    }

@app.post("/pets/{pet_id}/lost")
def set_lost_status(pet_id: int, payload: LostToggleRequest, db: Session = Depends(get_db)):
    pet = db.query(Pet).filter(Pet.id == pet_id).first()
    if pet is None:
        raise HTTPException(status_code=404, detail="Pet ne postoji.")

    # Privremena "provera vlasnika" (dok nemamo pravi login)
    if pet.owner_email != payload.owner_email:
        raise HTTPException(status_code=403, detail="Nisi vlasnik ovog ljubimca.")

    tag = db.query(Tag).filter(Tag.id == pet.tag_id).first()
    if tag is None:
        raise HTTPException(status_code=500, detail="Tag nije pronađen za ovog ljubimca.")

    if payload.lost:
        pet.status = PetStatus.LOST
        tag.status = TagStatus.LOST_TAG
    else:
        pet.status = PetStatus.ACTIVE
        tag.status = TagStatus.ASSIGNED  # vraćamo normalno stanje (tag je i dalje dodeljen)

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

@app.get("/api/t/{tag_id}")
def public_tag_view(tag_id: str, db: Session = Depends(get_db)):
    tag = db.query(Tag).filter(Tag.tag_id == tag_id).first()
    if tag is None:
        return {"state": "UNKNOWN", "message": "Tag nije pronađen."}

    if tag.status == TagStatus.REMOVED:
        return {"state": "REMOVED", "message": "Ovaj tag nije aktivan."}

    pet = db.query(Pet).filter(Pet.tag_id == tag.id).first()

    # Ako tag postoji ali još nije dodeljen ljubimcu
    if pet is None:
        return {"state": "UNASSIGNED", "message": "Tag je aktivan, ali nije dodeljen ljubimcu."}

    # DECEASED: prikazuje se samo kroz NFC scan (mi smo već na NFC view-u)
    if pet.status == PetStatus.DECEASED:
        return {
            "state": "DECEASED",
            "pet": {"name": pet.name, "species": pet.species},
            "message": "Ljubimac je označen kao preminuo."
        }

    # SAFE (ACTIVE): bez kontakta
    if pet.status == PetStatus.ACTIVE:
        return {
            "state": "SAFE",
            "pet": {"name": pet.name, "species": pet.species},
            "message": "Ljubimac nije prijavljen kao izgubljen."
        }

    # LOST: prikaži kontakt
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
            "cta": "Kontaktiraj vlasnika"
        }


    
@app.get("/t/{tag_id}", response_class=HTMLResponse)
def public_tag_page(tag_id: str, request: Request, db: Session = Depends(get_db)):
    data = public_tag_view(tag_id=tag_id, db=db)

    # data je dict koji već vraća state/message/pet/contact
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

@app.post("/owner/profile")
def upsert_owner_profile(payload: OwnerProfileRequest, db: Session = Depends(get_db)):
    profile = db.query(OwnerProfile).filter(OwnerProfile.email == payload.email).first()

    if profile is None:
        profile = OwnerProfile(email=payload.email, phone=payload.phone, city=payload.city)
        db.add(profile)
    else:
        profile.phone = payload.phone
        profile.city = payload.city
        db.add(profile)

    db.commit()
    db.refresh(profile)

    return {"email": profile.email, "phone": profile.phone, "city": profile.city}

@app.get("/pets/my")
def my_pets(owner_email: EmailStr, db: Session = Depends(get_db)):
    pets = db.query(Pet).filter(Pet.owner_email == owner_email).all()

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
    # OAuth2 standard: form_data.username i form_data.password
    user = db.query(User).filter(User.email == form_data.username).first()
    if user is None or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Pogrešan email ili lozinka.")

    token = create_access_token(user.email)
    return {"access_token": token, "token_type": "bearer"}



@app.get("/auth/me")
def me(current_user: User = Depends(get_current_user)):
    return {"email": current_user.email, "phone": current_user.phone, "city": current_user.city}

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


class LostToggleAuthRequest(BaseModel):
    lost: bool


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

@app.post("/tags/activate_auth")
def activate_tag_auth(
    payload: ActivateTagAuthRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    tag = db.query(Tag).filter(Tag.tag_id == payload.tag_id).first()

    if tag is None:
        tag = Tag(tag_id=payload.tag_id, status=TagStatus.FREE)
        db.add(tag)
        db.commit()
        db.refresh(tag)

    if tag.status != TagStatus.FREE:
        raise HTTPException(status_code=400, detail=f"Tag nije FREE (trenutno: {tag.status}).")

    tag.status = TagStatus.ACTIVE
    tag.owner_email = current_user.email
    db.add(tag)
    db.commit()
    db.refresh(tag)

    return {"tag_id": tag.tag_id, "status": tag.status, "owner_email": tag.owner_email}

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

    pet = Pet(
        name=payload.name,
        species=payload.species,
        birth_date=payload.birth_date,
        pedigree=payload.pedigree,
        status=PetStatus.ACTIVE,
        tag_id=tag.id,
        owner_email=current_user.email,
    )

    tag.status = TagStatus.ASSIGNED

    db.add(pet)
    db.add(tag)
    db.commit()
    db.refresh(pet)

    return {"pet_id": pet.id, "name": pet.name, "status": pet.status, "tag_status": tag.status}

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
