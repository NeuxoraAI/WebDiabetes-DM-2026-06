from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Doctor, Patient, User, UserRole
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse
from app.utils.security import create_access_token, hash_password, verify_password


def register_user(db: Session, data: RegisterRequest) -> User:
    existing = db.scalars(select(User).where(User.email == data.email)).first()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe una cuenta con ese correo electrónico",
        )

    user = User(
        email=data.email,
        password_hash=hash_password(data.password),
        role=data.role,
        full_name=data.full_name.strip(),
    )
    db.add(user)
    db.flush()

    if data.role == UserRole.patient:
        db.add(Patient(user_id=user.id, sex=data.sex, birth_date=data.birth_date))
    else:
        db.add(Doctor(user_id=user.id, cedula_profesional=data.cedula_profesional.strip()))

    db.commit()
    db.refresh(user)
    return user


def login(db: Session, data: LoginRequest) -> TokenResponse:
    user = db.scalars(select(User).where(User.email == data.email)).first()
    if user is None or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo o contraseña incorrectos",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Cuenta desactivada"
        )
    token = create_access_token(user.id, user.role.value)
    return TokenResponse(access_token=token, role=user.role, full_name=user.full_name)
