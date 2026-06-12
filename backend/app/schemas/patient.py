from datetime import date

from pydantic import BaseModel

from app.models import Sex
from app.schemas.adherence import AdherenceStatus


class PatientMe(BaseModel):
    patient_id: int
    full_name: str
    email: str
    sex: Sex
    birth_date: date
    doctor_name: str | None
    has_doctor: bool
    unread_messages: int
    adherence: AdherenceStatus
