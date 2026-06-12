from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import ClinicalRecord, Patient, Sex, User
from app.schemas.clinical_record import ClinicalRecordCreate, ClinicalRecordOut


def create_record(
    db: Session, patient: Patient, recorded_by: User, data: ClinicalRecordCreate
) -> ClinicalRecord:
    # Gestas solo aplica a pacientes de sexo femenino (PRD §11.7)
    if data.gestas is not None and patient.sex != Sex.F:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="El campo gestas solo aplica a pacientes de sexo femenino",
        )
    record = ClinicalRecord(
        patient_id=patient.id,
        recorded_by=recorded_by.id,
        **data.model_dump(),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def get_history(db: Session, patient_id: int) -> list[ClinicalRecordOut]:
    rows = db.execute(
        select(ClinicalRecord, User)
        .join(User, User.id == ClinicalRecord.recorded_by)
        .where(ClinicalRecord.patient_id == patient_id)
        .order_by(ClinicalRecord.recorded_at.asc())
    ).all()
    return [
        ClinicalRecordOut(
            id=r.id,
            weight=r.weight,
            waist_cm=r.waist_cm,
            height_cm=r.height_cm,
            glucose=r.glucose,
            hba1c=r.hba1c,
            body_fat_pct=r.body_fat_pct,
            gestas=r.gestas,
            recorded_at=r.recorded_at,
            recorded_by_name=u.full_name,
            recorded_by_role=u.role.value,
        )
        for r, u in rows
    ]


def get_latest_record(db: Session, patient_id: int) -> ClinicalRecord | None:
    return db.scalars(
        select(ClinicalRecord)
        .where(ClinicalRecord.patient_id == patient_id)
        .order_by(ClinicalRecord.recorded_at.desc())
        .limit(1)
    ).first()
