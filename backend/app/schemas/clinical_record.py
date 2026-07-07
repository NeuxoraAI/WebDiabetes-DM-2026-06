from datetime import datetime

from pydantic import BaseModel, Field, model_validator


class ClinicalRecordCreate(BaseModel):
    weight: float | None = Field(default=None, gt=0, lt=500)  # kg
    waist_cm: float | None = Field(default=None, gt=0, lt=400)
    height_cm: float | None = Field(default=None, gt=0, lt=300)
    glucose: float | None = Field(default=None, gt=0, lt=2000)  # mg/dL
    hba1c: float | None = Field(default=None, gt=0, lt=30)  # %
    body_fat_pct: float | None = Field(default=None, gt=0, lt=100)
    gestas: int | None = Field(default=None, ge=0, lt=30)  # solo mujeres

    @model_validator(mode="after")
    def at_least_one_value(self) -> "ClinicalRecordCreate":
        values = [
            self.weight,
            self.waist_cm,
            self.height_cm,
            self.glucose,
            self.hba1c,
            self.body_fat_pct,
            self.gestas,
        ]
        if all(v is None for v in values):
            raise ValueError("Debe capturar al menos un dato clínico")
        return self


class ClinicalRecordOut(BaseModel):
    id: int
    weight: float | None
    waist_cm: float | None
    height_cm: float | None
    glucose: float | None
    hba1c: float | None
    body_fat_pct: float | None
    gestas: int | None
    recorded_at: datetime
    recorded_by_name: str
    recorded_by_role: str
