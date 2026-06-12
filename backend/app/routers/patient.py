from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.data.questions import ANSWER_OPTIONS, QUESTIONS
from app.dependencies.auth import require_role
from app.dependencies.db import get_db
from app.models import Patient, User, UserRole
from app.schemas.adherence import (
    QuestionnaireDefinition,
    QuestionnaireOut,
    QuestionnaireSubmit,
)
from app.schemas.clinical_record import ClinicalRecordCreate, ClinicalRecordOut
from app.schemas.message import MessageCreate, MessageOut
from app.schemas.patient import PatientMe
from app.services import adherence_service, clinical_service, message_service

router = APIRouter(prefix="/api/patient", tags=["patient"])

require_patient = require_role(UserRole.patient)


def get_patient_profile(
    user: User = Depends(require_patient), db: Session = Depends(get_db)
) -> Patient:
    patient = db.scalars(select(Patient).where(Patient.user_id == user.id)).first()
    if patient is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Perfil de paciente no encontrado"
        )
    return patient


@router.get("/me", response_model=PatientMe)
def me(
    user: User = Depends(require_patient),
    patient: Patient = Depends(get_patient_profile),
    db: Session = Depends(get_db),
) -> PatientMe:
    doctor_name = None
    if patient.doctor_id is not None:
        doctor = db.get(User, patient.doctor_id)
        doctor_name = doctor.full_name if doctor else None
    return PatientMe(
        patient_id=patient.id,
        full_name=user.full_name,
        email=user.email,
        sex=patient.sex,
        birth_date=patient.birth_date,
        doctor_name=doctor_name,
        has_doctor=patient.doctor_id is not None,
        unread_messages=message_service.unread_count_for_patient(db, patient),
        adherence=adherence_service.get_status(db, patient.id),
    )


@router.get("/adherence/questions", response_model=QuestionnaireDefinition)
def questionnaire_definition(_: User = Depends(require_patient)) -> QuestionnaireDefinition:
    return QuestionnaireDefinition(
        questions=[
            {"number": i + 1, "text": text} for i, text in enumerate(QUESTIONS)
        ],
        options=ANSWER_OPTIONS,
    )


@router.get("/adherence", response_model=list[QuestionnaireOut])
def adherence_history(
    patient: Patient = Depends(get_patient_profile), db: Session = Depends(get_db)
) -> list[QuestionnaireOut]:
    return adherence_service.get_history(db, patient.id)


@router.post("/adherence", response_model=QuestionnaireOut, status_code=status.HTTP_201_CREATED)
def submit_adherence(
    data: QuestionnaireSubmit,
    patient: Patient = Depends(get_patient_profile),
    db: Session = Depends(get_db),
) -> QuestionnaireOut:
    return adherence_service.submit_questionnaire(db, patient, data.answers)


@router.get("/clinical", response_model=list[ClinicalRecordOut])
def clinical_history(
    patient: Patient = Depends(get_patient_profile), db: Session = Depends(get_db)
) -> list[ClinicalRecordOut]:
    return clinical_service.get_history(db, patient.id)


@router.post("/clinical", response_model=ClinicalRecordOut, status_code=status.HTTP_201_CREATED)
def add_clinical_record(
    data: ClinicalRecordCreate,
    user: User = Depends(require_patient),
    patient: Patient = Depends(get_patient_profile),
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


@router.get("/messages", response_model=list[MessageOut])
def messages(
    patient: Patient = Depends(get_patient_profile), db: Session = Depends(get_db)
) -> list[MessageOut]:
    return message_service.get_thread_for_patient(db, patient)


@router.post("/messages", response_model=MessageOut, status_code=status.HTTP_201_CREATED)
def send_message(
    data: MessageCreate,
    user: User = Depends(require_patient),
    patient: Patient = Depends(get_patient_profile),
    db: Session = Depends(get_db),
) -> MessageOut:
    return message_service.patient_send(db, patient, user, data.content)
