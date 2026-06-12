from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class AdherenceQuestionnaire(Base):
    __tablename__ = "adherence_questionnaires"

    id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"), index=True)
    score: Mapped[int] = mapped_column(Integer)
    stage: Mapped[str] = mapped_column(String(50))
    answered_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )

    answers = relationship(
        "QuestionnaireAnswer", back_populates="questionnaire", cascade="all, delete-orphan"
    )


class QuestionnaireAnswer(Base):
    __tablename__ = "questionnaire_answers"

    id: Mapped[int] = mapped_column(primary_key=True)
    questionnaire_id: Mapped[int] = mapped_column(
        ForeignKey("adherence_questionnaires.id"), index=True
    )
    question_number: Mapped[int] = mapped_column(Integer)
    answer_value: Mapped[int] = mapped_column(Integer)

    questionnaire = relationship("AdherenceQuestionnaire", back_populates="answers")
