from tests.conftest import auth_headers

SECOND_DOCTOR = {
    "full_name": "Dra. Carmen Segunda",
    "email": "carmen@test.com",
    "password": "password123",
    "role": "doctor",
    "cedula_profesional": "7654321",
}


def _patient_id(client, doctor_headers):
    registered = client.get(
        "/api/doctor/registered-patients", headers=doctor_headers
    ).json()
    return registered[0]["patient_id"]


def test_patient_without_doctor_cannot_send(client, patient_headers):
    res = client.post(
        "/api/patient/messages", json={"content": "Hola doctor"}, headers=patient_headers
    )
    assert res.status_code == 403


def test_add_patient_and_message_flow(client, patient_headers, doctor_headers):
    pid = _patient_id(client, doctor_headers)

    res = client.post(f"/api/doctor/patients/{pid}/add", headers=doctor_headers)
    assert res.status_code == 200

    # Un médico por paciente (PRD §11.5)
    second = auth_headers(client, SECOND_DOCTOR)
    res = client.post(f"/api/doctor/patients/{pid}/add", headers=second)
    assert res.status_code == 409
    assert "ya tiene médico asignado" in res.json()["detail"]

    # El segundo médico no accede a los datos del paciente (PRD §5.4)
    res = client.get(f"/api/doctor/patients/{pid}/clinical", headers=second)
    assert res.status_code == 403

    # Paciente envía mensaje
    res = client.post(
        "/api/patient/messages",
        json={"content": "¿Puedo tomar el medicamento en ayunas?"},
        headers=patient_headers,
    )
    assert res.status_code == 201

    # Aparece en el buzón del doctor
    inbox = client.get("/api/doctor/inbox", headers=doctor_headers).json()
    assert len(inbox) == 1
    assert inbox[0]["patient_name"] == "Ana Paciente"

    # Doctor responde → buzón vacío
    res = client.post(
        f"/api/doctor/patients/{pid}/messages",
        json={"content": "Sí, de preferencia con alimento."},
        headers=doctor_headers,
    )
    assert res.status_code == 201
    inbox = client.get("/api/doctor/inbox", headers=doctor_headers).json()
    assert inbox == []

    # Paciente ve la respuesta como no leída y al abrir el hilo se marca leída
    me = client.get("/api/patient/me", headers=patient_headers).json()
    assert me["unread_messages"] == 1
    thread = client.get("/api/patient/messages", headers=patient_headers).json()
    assert len(thread) == 2
    assert thread[1]["sender_role"] == "doctor"
    me = client.get("/api/patient/me", headers=patient_headers).json()
    assert me["unread_messages"] == 0


def test_doctor_can_add_clinical_record(client, patient_headers, doctor_headers):
    pid = _patient_id(client, doctor_headers)
    client.post(f"/api/doctor/patients/{pid}/add", headers=doctor_headers)

    res = client.post(
        f"/api/doctor/patients/{pid}/clinical",
        json={"glucose": 142.0},
        headers=doctor_headers,
    )
    assert res.status_code == 201
    assert res.json()["recorded_by_role"] == "doctor"

    history = client.get("/api/patient/clinical", headers=patient_headers).json()
    assert len(history) == 1


def test_doctor_cannot_view_unowned_patient(client, patient_headers, doctor_headers):
    pid = _patient_id(client, doctor_headers)
    res = client.get(f"/api/doctor/patients/{pid}", headers=doctor_headers)
    assert res.status_code == 403
