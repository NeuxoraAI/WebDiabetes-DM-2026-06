from datetime import datetime

from pydantic import BaseModel, Field

from app.data.questions import TOTAL_QUESTIONS


class AnswerOption(BaseModel):
    value: int
    label: str


class QuestionItem(BaseModel):
    number: int
    text: str


class QuestionnaireDefinition(BaseModel):
    questions: list[QuestionItem]
    options: list[AnswerOption]


class QuestionnaireSubmit(BaseModel):
    # answers[i] = elección de la pregunta i+1 (1=Nunca … 5=Siempre); deben
    # venir las 29 (PRD §4.2). El puntaje por ítem lo calcula el backend.
    answers: list[int] = Field(
        min_length=TOTAL_QUESTIONS, max_length=TOTAL_QUESTIONS
    )


class QuestionnaireOut(BaseModel):
    id: int
    score: int
    stage: str
    stage_description: str
    answered_at: datetime
    next_due_date: datetime

    model_config = {"from_attributes": True}


class AdherenceStatus(BaseModel):
    is_new_user: bool
    days_since_last: int | None
    questionnaire_due: bool
    latest: QuestionnaireOut | None
