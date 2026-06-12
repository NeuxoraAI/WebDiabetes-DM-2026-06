import enum
from datetime import date

from sqlalchemy import Date, Enum, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Sex(str, enum.Enum):
    M = "M"
    F = "F"


class Patient(Base):
    __tablename__ = "patients"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True)
    sex: Mapped[Sex] = mapped_column(Enum(Sex))
    birth_date: Mapped[date] = mapped_column(Date)
    # FK al usuario (rol doctor) que agregó al paciente a su lista; null = sin médico
    doctor_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)

    user = relationship("User", foreign_keys=[user_id])
    doctor_user = relationship("User", foreign_keys=[doctor_id])
