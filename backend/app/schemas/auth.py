from datetime import date

from pydantic import BaseModel, EmailStr, Field, model_validator

from app.models import Sex, UserRole


class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=3, max_length=255)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    role: UserRole
    # Solo pacientes
    birth_date: date | None = None
    sex: Sex | None = None
    # Solo médicos
    cedula_profesional: str | None = Field(default=None, max_length=50)

    @model_validator(mode="after")
    def validate_role_fields(self) -> "RegisterRequest":
        if self.role == UserRole.patient:
            if self.birth_date is None or self.sex is None:
                raise ValueError(
                    "Los pacientes deben indicar fecha de nacimiento y sexo"
                )
        if self.role == UserRole.doctor:
            if not self.cedula_profesional or not self.cedula_profesional.strip():
                raise ValueError("Los médicos deben indicar su cédula profesional")
        return self


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: UserRole
    full_name: str
