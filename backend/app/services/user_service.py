from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Doctor, Patient, User
from app.schemas.profile import DoctorProfileUpdate, PatientProfileUpdate
from app.utils.security import hash_password, verify_password


def _ensure_email_available(db: Session, user: User, new_email: str) -> None:
    """El correo debe ser único; se ignora si es el del propio usuario."""
    if new_email == user.email:
        return
    existing = db.scalars(select(User).where(User.email == new_email)).first()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe una cuenta con ese correo electrónico",
        )


def _verify_current_password(user: User, current_password: str | None) -> None:
    if not current_password or not verify_password(current_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="La contraseña actual es incorrecta",
        )


def update_patient_profile(
    db: Session, user: User, patient: Patient, data: PatientProfileUpdate
) -> None:
    if data.full_name is not None:
        user.full_name = data.full_name.strip()
    if data.email is not None:
        _verify_current_password(user, data.current_password)
        _ensure_email_available(db, user, data.email)
        user.email = data.email
    if data.birth_date is not None:
        patient.birth_date = data.birth_date
    if data.sex is not None:
        patient.sex = data.sex
    db.commit()


def update_doctor_profile(
    db: Session, user: User, doctor: Doctor, data: DoctorProfileUpdate
) -> None:
    if data.full_name is not None:
        user.full_name = data.full_name.strip()
    if data.email is not None:
        _verify_current_password(user, data.current_password)
        _ensure_email_available(db, user, data.email)
        user.email = data.email
    if data.cedula_profesional is not None:
        doctor.cedula_profesional = data.cedula_profesional.strip()
    db.commit()


def change_password(
    db: Session, user: User, current_password: str, new_password: str
) -> None:
    _verify_current_password(user, current_password)
    user.password_hash = hash_password(new_password)
    db.commit()
