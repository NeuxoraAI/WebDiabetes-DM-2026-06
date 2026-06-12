import pytest

from app.data.questions import REVERSE_ITEMS, points_for
from app.services.adherence_service import compute_stage

# Respuestas que dan el mejor puntaje por ítem (5 pts) y el peor (1 pt)
BEST_ANSWERS = [1 if n in REVERSE_ITEMS else 5 for n in range(1, 30)]
WORST_ANSWERS = [5 if n in REVERSE_ITEMS else 1 for n in range(1, 30)]


@pytest.mark.parametrize(
    "score,expected",
    [
        (29, "Precontemplación"),
        (57, "Precontemplación"),
        (58, "Contemplación"),
        (86, "Contemplación"),
        (87, "Preparación"),
        (115, "Preparación"),
        (116, "Acción"),
        (130, "Acción"),
        (131, "Mantenimiento"),
        (145, "Mantenimiento"),
    ],
)
def test_compute_stage_ranges(score, expected):
    assert compute_stage(score)[0] == expected


def test_compute_stage_out_of_range():
    with pytest.raises(ValueError):
        compute_stage(28)
    with pytest.raises(ValueError):
        compute_stage(146)


def test_reverse_items_score_inverted():
    assert REVERSE_ITEMS == frozenset({9, 10, 11, 12, 13, 29})
    assert points_for(1, 5) == 5  # ítem directo: Siempre = 5 pts
    assert points_for(9, 5) == 1  # ítem invertido: Siempre = 1 pt
    assert points_for(9, 1) == 5  # ítem invertido: Nunca = 5 pts


def test_get_questions(client, patient_headers):
    res = client.get("/api/patient/adherence/questions", headers=patient_headers)
    assert res.status_code == 200
    body = res.json()
    assert len(body["questions"]) == 29
    assert len(body["options"]) == 5
    assert body["options"][0] == {"value": 1, "label": "Nunca"}
    assert body["options"][-1] == {"value": 5, "label": "Siempre"}


def test_submit_minimum_score(client, patient_headers):
    res = client.post(
        "/api/patient/adherence", json={"answers": WORST_ANSWERS}, headers=patient_headers
    )
    assert res.status_code == 201
    body = res.json()
    assert body["score"] == 29
    assert body["stage"] == "Precontemplación"


def test_submit_maximum_score(client, patient_headers):
    res = client.post(
        "/api/patient/adherence", json={"answers": BEST_ANSWERS}, headers=patient_headers
    )
    assert res.status_code == 201
    body = res.json()
    assert body["score"] == 145
    assert body["stage"] == "Mantenimiento"
    assert body["next_due_date"] > body["answered_at"]


def test_submit_all_siempre_penalizes_reverse_items(client, patient_headers):
    # 23 ítems directos × 5 pts + 6 invertidos × 1 pt = 121
    res = client.post(
        "/api/patient/adherence", json={"answers": [5] * 29}, headers=patient_headers
    )
    assert res.status_code == 201
    assert res.json()["score"] == 121


def test_submit_incomplete_rejected(client, patient_headers):
    res = client.post(
        "/api/patient/adherence", json={"answers": [3] * 28}, headers=patient_headers
    )
    assert res.status_code == 422


def test_submit_out_of_range_rejected(client, patient_headers):
    res = client.post(
        "/api/patient/adherence", json={"answers": [3] * 28 + [6]}, headers=patient_headers
    )
    assert res.status_code == 422


def test_history_and_status(client, patient_headers):
    me = client.get("/api/patient/me", headers=patient_headers).json()
    assert me["adherence"]["is_new_user"] is True
    assert me["adherence"]["questionnaire_due"] is True

    # 23 directos × 4 + 6 invertidos × 2 = 104
    client.post("/api/patient/adherence", json={"answers": [4] * 29}, headers=patient_headers)

    me = client.get("/api/patient/me", headers=patient_headers).json()
    assert me["adherence"]["is_new_user"] is False
    assert me["adherence"]["questionnaire_due"] is False
    assert me["adherence"]["latest"]["score"] == 104
    assert me["adherence"]["latest"]["stage"] == "Preparación"

    history = client.get("/api/patient/adherence", headers=patient_headers).json()
    assert len(history) == 1
