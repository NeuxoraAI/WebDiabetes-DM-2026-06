from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.dependencies.auth import require_role
from app.dependencies.db import get_db
from app.models import Patient, User, UserRole
from app.schemas.adherence import QuestionnaireOut
from app.schemas.clinical_record import ClinicalRecordCreate, ClinicalRecordOut
from app.schemas.doctor import MyPatientItem, PatientDetail, RegisteredPatientItem
from app.schemas.message import InboxItem, MessageCreate, MessageOut
from app.services import adherence_service, clinical_service, message_service

router = APIRouter(prefix="/api/doctor", tags=["doctor"])

require_doctor = require_role(UserRole.doctor)


def get_owned_patient(
    patient_id: int,
    user: User = Depends(require_doctor),
    db: Session = Depends(get_db),
) -> Patient:
    """Solo pacientes en la lista del doctor (PRD §5.4)."""
    patient = db.get(Patient, patient_id)
    if patient is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Paciente no encontrado"
        )
    if patient.doctor_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Este paciente no está en tu lista",
        )
    return patient


@router.get("/registered-patients", response_model=list[RegisteredPatientItem])
def registered_patients(
    user: User = Depends(require_doctor), db: Session = Depends(get_db)
) -> list[RegisteredPatientItem]:
    rows = db.execute(
        select(Patient, User)
        .join(User, User.id == Patient.user_id)
        .where(
            (Patient.doctor_id.is_(None)) | (Patient.doctor_id != user.id),
            User.is_active.is_(True),
        )
        .order_by(User.created_at.desc())
    ).all()
    items = []
    for patient, patient_user in rows:
        latest = adherence_service.get_latest(db, patient.id)
        items.append(
            RegisteredPatientItem(
                patient_id=patient.id,
                full_name=patient_user.full_name,
                sex=patient.sex,
                registered_at=patient_user.created_at,
                latest_stage=latest.stage if latest else None,
                latest_score=latest.score if latest else None,
                has_doctor=patient.doctor_id is not None,
            )
        )
    return items


@router.post("/patients/{patient_id}/add", response_model=MyPatientItem)
def add_patient(
    patient_id: int,
    user: User = Depends(require_doctor),
    db: Session = Depends(get_db),
) -> MyPatientItem:
    patient = db.get(Patient, patient_id)
    if patient is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Paciente no encontrado"
        )
    if patient.doctor_id == user.id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Este paciente ya está en tu lista",
        )
    if patient.doctor_id is not None:
        # Un médico por paciente en v1 (PRD §11.5)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Este paciente ya tiene médico asignado",
        )
    patient.doctor_id = user.id
    db.commit()
    return _my_patient_item(db, patient)


def _my_patient_item(db: Session, patient: Patient) -> MyPatientItem:
    patient_user = db.get(User, patient.user_id)
    latest = adherence_service.get_latest(db, patient.id)
    latest_clinical = clinical_service.get_latest_record(db, patient.id)
    return MyPatientItem(
        patient_id=patient.id,
        full_name=patient_user.full_name,
        sex=patient.sex,
        latest_stage=latest.stage if latest else None,
        latest_score=latest.score if latest else None,
        latest_questionnaire_at=latest.answered_at if latest else None,
        latest_clinical_at=latest_clinical.recorded_at if latest_clinical else None,
        unanswered_messages=message_service.unanswered_count(db, patient.id),
    )


@router.get("/patients", response_model=list[MyPatientItem])
def my_patients(
    user: User = Depends(require_doctor), db: Session = Depends(get_db)
) -> list[MyPatientItem]:
    patients = db.scalars(
        select(Patient).where(Patient.doctor_id == user.id)
    ).all()
    return [_my_patient_item(db, p) for p in patients]


@router.get("/patients/{patient_id}", response_model=PatientDetail)
def patient_detail(
    patient: Patient = Depends(get_owned_patient), db: Session = Depends(get_db)
) -> PatientDetail:
    patient_user = db.get(User, patient.user_id)
    adh_status = adherence_service.get_status(db, patient.id)
    latest = adh_status.latest
    return PatientDetail(
        patient_id=patient.id,
        full_name=patient_user.full_name,
        email=patient_user.email,
        sex=patient.sex,
        birth_date=patient.birth_date,
        registered_at=patient_user.created_at,
        latest_stage=latest.stage if latest else None,
        latest_score=latest.score if latest else None,
        latest_questionnaire_at=latest.answered_at if latest else None,
        questionnaire_due=adh_status.questionnaire_due,
    )


@router.get("/patients/{patient_id}/adherence", response_model=list[QuestionnaireOut])
def patient_adherence(
    patient: Patient = Depends(get_owned_patient), db: Session = Depends(get_db)
) -> list[QuestionnaireOut]:
    return adherence_service.get_history(db, patient.id)


@router.get("/patients/{patient_id}/clinical", response_model=list[ClinicalRecordOut])
def patient_clinical(
    patient: Patient = Depends(get_owned_patient), db: Session = Depends(get_db)
) -> list[ClinicalRecordOut]:
    return clinical_service.get_history(db, patient.id)


@router.post(
    "/patients/{patient_id}/clinical",
    response_model=ClinicalRecordOut,
    status_code=status.HTTP_201_CREATED,
)
def add_patient_clinical(
    data: ClinicalRecordCreate,
    patient: Patient = Depends(get_owned_patient),
    user: User = Depends(require_doctor),
    db: Session = Depends(get_db),
) -> ClinicalRecordOut:
    record = clinical_service.create_record(db, patient, user, data)
    return ClinicalRecordOut(
        id=record.id,
        weight=record.weight,
        waist_cm=record.waist_cm,
        height_cm=record.height_cm,
        glucose=record.glucose,
        hba1c=record.hba1c,
        body_fat_pct=record.body_fat_pct,
        gestas=record.gestas,
        recorded_at=record.recorded_at,
        recorded_by_name=user.full_name,
        recorded_by_role=user.role.value,
    )


@router.get("/patients/{patient_id}/messages", response_model=list[MessageOut])
def patient_messages(
    patient: Patient = Depends(get_owned_patient),
    user: User = Depends(require_doctor),
    db: Session = Depends(get_db),
) -> list[MessageOut]:
    return message_service.get_thread_for_doctor(db, patient, user)


@router.post(
    "/patients/{patient_id}/messages",
    response_model=MessageOut,
    status_code=status.HTTP_201_CREATED,
)
def reply_message(
    data: MessageCreate,
    patient: Patient = Depends(get_owned_patient),
    user: User = Depends(require_doctor),
    db: Session = Depends(get_db),
) -> MessageOut:
    return message_service.doctor_send(db, patient, user, data.content)


@router.get("/inbox", response_model=list[InboxItem])
def inbox(
    user: User = Depends(require_doctor), db: Session = Depends(get_db)
) -> list[InboxItem]:
    return message_service.doctor_inbox(db, user)
