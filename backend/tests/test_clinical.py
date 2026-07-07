from tests.conftest import auth_headers

MALE_PATIENT = {
    "full_name": "Pedro Paciente",
    "email": "pedro@test.com",
    "password": "password123",
    "role": "patient",
    "birth_date": "1968-11-02",
    "sex": "M",
}


def test_add_and_list_clinical_record(client, patient_headers):
    res = client.post(
        "/api/patient/clinical",
        json={"weight": 78.5, "glucose": 130, "hba1c": 7.2},
        headers=patient_headers,
    )
    assert res.status_code == 201
    body = res.json()
    assert body["weight"] == 78.5
    assert body["recorded_by_role"] == "patient"

    history = client.get("/api/patient/clinical", headers=patient_headers).json()
    assert len(history) == 1
    assert history[0]["glucose"] == 130


def test_empty_record_rejected(client, patient_headers):
    res = client.post("/api/patient/clinical", json={}, headers=patient_headers)
    assert res.status_code == 422


def test_gestas_allowed_for_female(client, patient_headers):
    res = client.post(
        "/api/patient/clinical", json={"gestas": 3}, headers=patient_headers
    )
    assert res.status_code == 201
    assert res.json()["gestas"] == 3


def test_gestas_rejected_for_male(client):
    headers = auth_headers(client, MALE_PATIENT)
    res = client.post("/api/patient/clinical", json={"gestas": 2}, headers=headers)
    assert res.status_code == 422


def test_negative_values_rejected(client, patient_headers):
    res = client.post(
        "/api/patient/clinical", json={"weight": -10}, headers=patient_headers
    )
    assert res.status_code == 422
