from tests.conftest import DOCTOR_PAYLOAD, PATIENT_PAYLOAD


def test_register_patient(client):
    res = client.post("/api/auth/register", json=PATIENT_PAYLOAD)
    assert res.status_code == 201
    body = res.json()
    assert body["role"] == "patient"
    assert body["access_token"]


def test_register_doctor(client):
    res = client.post("/api/auth/register", json=DOCTOR_PAYLOAD)
    assert res.status_code == 201
    assert res.json()["role"] == "doctor"


def test_register_duplicate_email(client):
    client.post("/api/auth/register", json=PATIENT_PAYLOAD)
    res = client.post("/api/auth/register", json=PATIENT_PAYLOAD)
    assert res.status_code == 409


def test_register_patient_requires_sex_and_birth_date(client):
    payload = {**PATIENT_PAYLOAD}
    del payload["sex"]
    res = client.post("/api/auth/register", json=payload)
    assert res.status_code == 422


def test_register_doctor_requires_cedula(client):
    payload = {**DOCTOR_PAYLOAD}
    del payload["cedula_profesional"]
    res = client.post("/api/auth/register", json=payload)
    assert res.status_code == 422


def test_login_ok(client):
    client.post("/api/auth/register", json=PATIENT_PAYLOAD)
    res = client.post(
        "/api/auth/login",
        json={"email": PATIENT_PAYLOAD["email"], "password": PATIENT_PAYLOAD["password"]},
    )
    assert res.status_code == 200
    assert res.json()["role"] == "patient"


def test_login_wrong_password(client):
    client.post("/api/auth/register", json=PATIENT_PAYLOAD)
    res = client.post(
        "/api/auth/login",
        json={"email": PATIENT_PAYLOAD["email"], "password": "incorrecta1"},
    )
    assert res.status_code == 401


def test_protected_endpoint_requires_token(client):
    res = client.get("/api/patient/me")
    assert res.status_code == 401


def test_role_enforcement(client, patient_headers):
    res = client.get("/api/doctor/patients", headers=patient_headers)
    assert res.status_code == 403
