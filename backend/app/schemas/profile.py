from datetime import date

from pydantic import BaseModel, EmailStr, Field, model_validator

from app.models import Sex


class PatientProfileUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=3, max_length=255)
    email: EmailStr | None = None
    birth_date: date | None = None
    sex: Sex | None = None
    # Requerida solo cuando se cambia el correo (verificación de identidad).
    current_password: str | None = None

    @model_validator(mode="after")
    def validate_update(self) -> "PatientProfileUpdate":
        if not any(
            v is not None
            for v in (self.full_name, self.email, self.birth_date, self.sex)
        ):
            raise ValueError("No hay cambios que guardar")
        if self.email is not None and not self.current_password:
            raise ValueError("Para cambiar el correo debes indicar tu contraseña actual")
        return self


class DoctorProfileUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=3, max_length=255)
    email: EmailStr | None = None
    cedula_profesional: str | None = Field(default=None, max_length=50)
    # Requerida solo cuando se cambia el correo (verificación de identidad).
    current_password: str | None = None

    @model_validator(mode="after")
    def validate_update(self) -> "DoctorProfileUpdate":
        if not any(
            v is not None
            for v in (self.full_name, self.email, self.cedula_profesional)
        ):
            raise ValueError("No hay cambios que guardar")
        if self.email is not None and not self.current_password:
            raise ValueError("Para cambiar el correo debes indicar tu contraseña actual")
        return self


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=128)


class DoctorMe(BaseModel):
    doctor_id: int
    full_name: str
    email: str
    cedula_profesional: str
