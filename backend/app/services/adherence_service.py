from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.data.questions import TOTAL_QUESTIONS, points_for
from app.models import AdherenceQuestionnaire, Patient, QuestionnaireAnswer
from app.schemas.adherence import AdherenceStatus, QuestionnaireOut
from app.utils.date_utils import (
    QUESTIONNAIRE_PERIOD_DAYS,
    days_since,
    next_questionnaire_date,
)

MIN_ANSWER = 1
MAX_ANSWER = 5

# ⚠️ Rangos interpretados del documento original (PRD §4.2, punto abierto #1).
# Pendiente de validación con el investigador responsable.
STAGES: list[tuple[int, int, str, str]] = [
    (29, 57, "Precontemplación", "Aún no consideras cambios en tu manejo. Hablar con tu médico es un buen primer paso."),
    (58, 86, "Contemplación", "Estás pensando en mejorar tu manejo. Pequeños cambios constantes hacen una gran diferencia."),
    (87, 115, "Preparación", "Te estás preparando para un mejor control. ¡Sigue construyendo tus nuevos hábitos!"),
    (116, 130, "Acción", "Estás tomando acciones concretas por tu salud. ¡Excelente trabajo, mantén el ritmo!"),
    (131, 145, "Mantenimiento", "Mantienes una adherencia sobresaliente. ¡Sigue así, tu constancia protege tu salud!"),
]


def compute_stage(score: int) -> tuple[str, str]:
    for low, high, name, description in STAGES:
        if low <= score <= high:
            return name, description
    raise ValueError(f"Puntaje fuera de rango: {score}")


def stage_description(stage_name: str) -> str:
    for _, _, name, description in STAGES:
        if name == stage_name:
            return description
    return ""


def _to_out(q: AdherenceQuestionnaire) -> QuestionnaireOut:
    return QuestionnaireOut(
        id=q.id,
        score=q.score,
        stage=q.stage,
        stage_description=stage_description(q.stage),
        answered_at=q.answered_at,
        next_due_date=next_questionnaire_date(q.answered_at),
    )


def submit_questionnaire(
    db: Session, patient: Patient, answers: list[int]
) -> QuestionnaireOut:
    if len(answers) != TOTAL_QUESTIONS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"El cuestionario debe responderse completo ({TOTAL_QUESTIONS} ítems)",
        )
    invalid = [i + 1 for i, v in enumerate(answers) if not MIN_ANSWER <= v <= MAX_ANSWER]
    if invalid:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Respuestas fuera de rango (1-5) en los ítems: {invalid}",
        )

    # El puntaje por ítem varía: hay ítems directos e invertidos (questions.py).
    # answer_value guarda la elección cruda del paciente (1=Nunca … 5=Siempre).
    score = sum(
        points_for(number, choice) for number, choice in enumerate(answers, start=1)
    )
    stage, _ = compute_stage(score)

    questionnaire = AdherenceQuestionnaire(patient_id=patient.id, score=score, stage=stage)
    db.add(questionnaire)
    db.flush()
    for number, value in enumerate(answers, start=1):
        db.add(
            QuestionnaireAnswer(
                questionnaire_id=questionnaire.id,
                question_number=number,
                answer_value=value,
            )
        )
    db.commit()
    db.refresh(questionnaire)
    return _to_out(questionnaire)


def get_history(db: Session, patient_id: int) -> list[QuestionnaireOut]:
    rows = db.scalars(
        select(AdherenceQuestionnaire)
        .where(AdherenceQuestionnaire.patient_id == patient_id)
        .order_by(AdherenceQuestionnaire.answered_at.asc())
    ).all()
    return [_to_out(q) for q in rows]


def get_latest(db: Session, patient_id: int) -> AdherenceQuestionnaire | None:
    return db.scalars(
        select(AdherenceQuestionnaire)
        .where(AdherenceQuestionnaire.patient_id == patient_id)
        .order_by(AdherenceQuestionnaire.answered_at.desc())
        .limit(1)
    ).first()


def get_status(db: Session, patient_id: int) -> AdherenceStatus:
    latest = get_latest(db, patient_id)
    if latest is None:
        return AdherenceStatus(
            is_new_user=True, days_since_last=None, questionnaire_due=True, latest=None
        )
    days = days_since(latest.answered_at)
    return AdherenceStatus(
        is_new_user=False,
        days_since_last=days,
        questionnaire_due=days > QUESTIONNAIRE_PERIOD_DAYS,
        latest=_to_out(latest),
    )
