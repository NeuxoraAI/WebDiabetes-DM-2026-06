import os

os.environ["DATABASE_URL"] = "sqlite://"  # antes de importar la app

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.dependencies.db import get_db
from app.main import app

test_engine = create_engine(
    "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
)
TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture()
def client():
    Base.metadata.create_all(bind=test_engine)

    def override_get_db():
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=test_engine)


PATIENT_PAYLOAD = {
    "full_name": "Ana Paciente",
    "email": "ana@test.com",
    "password": "password123",
    "role": "patient",
    "birth_date": "1975-03-15",
    "sex": "F",
}

DOCTOR_PAYLOAD = {
    "full_name": "Dr. Luis Médico",
    "email": "luis@test.com",
    "password": "password123",
    "role": "doctor",
    "cedula_profesional": "1234567",
}


def auth_headers(client, payload):
    res = client.post("/api/auth/register", json=payload)
    assert res.status_code == 201, res.text
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


@pytest.fixture()
def patient_headers(client):
    return auth_headers(client, PATIENT_PAYLOAD)


@pytest.fixture()
def doctor_headers(client):
    return auth_headers(client, DOCTOR_PAYLOAD)
