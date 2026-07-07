from tests.conftest import DOCTOR_PAYLOAD, PATIENT_PAYLOAD


# --- Paciente ---

def test_patient_update_basic_fields(client, patient_headers):
    res = client.patch(
        "/api/patient/me",
        headers=patient_headers,
        json={"full_name": "Ana Nueva", "birth_date": "1980-01-01", "sex": "M"},
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["full_name"] == "Ana Nueva"
    assert body["birth_date"] == "1980-01-01"
    assert body["sex"] == "M"

    me = client.get("/api/patient/me", headers=patient_headers).json()
    assert me["full_name"] == "Ana Nueva"
    assert me["sex"] == "M"


def test_patient_update_empty_payload_rejected(client, patient_headers):
    res = client.patch("/api/patient/me", headers=patient_headers, json={})
    assert res.status_code == 422


def test_patient_email_change_requires_current_password(client, patient_headers):
    res = client.patch(
        "/api/patient/me",
        headers=patient_headers,
        json={"email": "nueva@test.com"},
    )
    assert res.status_code == 422  # el validador exige current_password


def test_patient_email_change_wrong_password(client, patient_headers):
    res = client.patch(
        "/api/patient/me",
        headers=patient_headers,
        json={"email": "nueva@test.com", "current_password": "incorrecta"},
    )
    assert res.status_code == 401


def test_patient_email_change_duplicate(client, patient_headers):
    # Registrar un médico ocupa "luis@test.com"; el paciente intenta usarlo.
    client.post("/api/auth/register", json=DOCTOR_PAYLOAD)
    res = client.patch(
        "/api/patient/me",
        headers=patient_headers,
        json={"email": DOCTOR_PAYLOAD["email"], "current_password": PATIENT_PAYLOAD["password"]},
    )
    assert res.status_code == 409


def test_patient_email_change_success(client, patient_headers):
    res = client.patch(
        "/api/patient/me",
        headers=patient_headers,
        json={"email": "ana.nueva@test.com", "current_password": PATIENT_PAYLOAD["password"]},
    )
    assert res.status_code == 200, res.text
    assert res.json()["email"] == "ana.nueva@test.com"


# --- Médico ---

def test_doctor_me_returns_profile(client, doctor_headers):
    res = client.get("/api/doctor/me", headers=doctor_headers)
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["full_name"] == DOCTOR_PAYLOAD["full_name"]
    assert body["email"] == DOCTOR_PAYLOAD["email"]
    assert body["cedula_profesional"] == DOCTOR_PAYLOAD["cedula_profesional"]


def test_doctor_update_name_and_cedula(client, doctor_headers):
    res = client.patch(
        "/api/doctor/me",
        headers=doctor_headers,
        json={"full_name": "Dr. Luis Actualizado", "cedula_profesional": "9998887"},
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["full_name"] == "Dr. Luis Actualizado"
    assert body["cedula_profesional"] == "9998887"


# --- Cambio de contraseña (compartido) ---

def test_change_password_flow(client, patient_headers):
    res = client.post(
        "/api/auth/change-password",
        headers=patient_headers,
        json={"current_password": PATIENT_PAYLOAD["password"], "new_password": "nuevaclave99"},
    )
    assert res.status_code == 200, res.text

    # La contraseña vieja ya no sirve.
    old = client.post(
        "/api/auth/login",
        json={"email": PATIENT_PAYLOAD["email"], "password": PATIENT_PAYLOAD["password"]},
    )
    assert old.status_code == 401

    # La nueva sí.
    new = client.post(
        "/api/auth/login",
        json={"email": PATIENT_PAYLOAD["email"], "password": "nuevaclave99"},
    )
    assert new.status_code == 200, new.text


def test_change_password_wrong_current(client, patient_headers):
    res = client.post(
        "/api/auth/change-password",
        headers=patient_headers,
        json={"current_password": "incorrecta", "new_password": "nuevaclave99"},
    )
    assert res.status_code == 401


def test_change_password_too_short(client, patient_headers):
    res = client.post(
        "/api/auth/change-password",
        headers=patient_headers,
        json={"current_password": PATIENT_PAYLOAD["password"], "new_password": "corta"},
    )
    assert res.status_code == 422
