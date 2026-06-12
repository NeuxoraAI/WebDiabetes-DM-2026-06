from datetime import date, datetime

from pydantic import BaseModel

from app.models import Sex


class RegisteredPatientItem(BaseModel):
    """Paciente sin médico asignado: solo nombre, sexo y adherencia (PRD §5.4)."""

    patient_id: int
    full_name: str
    sex: Sex
    registered_at: datetime
    latest_stage: str | None
    latest_score: int | None
    has_doctor: bool


class MyPatientItem(BaseModel):
    patient_id: int
    full_name: str
    sex: Sex
    latest_stage: str | None
    latest_score: int | None
    latest_questionnaire_at: datetime | None
    latest_clinical_at: datetime | None
    unanswered_messages: int


class PatientDetail(BaseModel):
    patient_id: int
    full_name: str
    email: str
    sex: Sex
    birth_date: date
    registered_at: datetime
    latest_stage: str | None
    latest_score: int | None
    latest_questionnaire_at: datetime | None
    questionnaire_due: bool
