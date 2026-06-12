from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ClinicalRecord(Base):
    """Registro clínico inmutable: nunca se edita ni elimina (PRD §11.3)."""

    __tablename__ = "clinical_records"

    id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"), index=True)
    recorded_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    weight: Mapped[float | None] = mapped_column(Numeric(6, 2), nullable=True)
    waist_cm: Mapped[float | None] = mapped_column(Numeric(6, 2), nullable=True)
    height_cm: Mapped[float | None] = mapped_column(Numeric(6, 2), nullable=True)
    glucose: Mapped[float | None] = mapped_column(Numeric(6, 2), nullable=True)
    hba1c: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    body_fat_pct: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    gestas: Mapped[int | None] = mapped_column(Integer, nullable=True)  # solo mujeres
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )
