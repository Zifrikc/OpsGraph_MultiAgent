"""Real FalkorDB + MCP integration, isolated graph per test session."""

import os
from uuid import uuid4
import pytest
from fastapi.testclient import TestClient
from app.core.config import get_settings
from app.infrastructure.graph import GraphRepository
from app.main import app


@pytest.fixture(scope="module")
def client():
    if not os.getenv("RUN_INTEGRATION"):
        pytest.skip("Use scripts/check.ps1 to supply local database configuration")
    os.environ["FALKORDB_GRAPH"] = "opsgraph_test_" + uuid4().hex
    os.environ["MODEL_PROVIDER"] = "none"
    get_settings.cache_clear()
    with TestClient(
        app, headers={"X-Opsgraph-Token": get_settings().api_token.get_secret_value()}
    ) as c:
        login = c.post(
            "/auth/login",
            json={"username": "admin", "password": get_settings().admin_password.get_secret_value()},
        )
        assert login.status_code == 200
        c.headers["Authorization"] = "Bearer " + login.json()["token"]
        yield c
    GraphRepository().graph.delete()
    get_settings.cache_clear()


def test_auth_and_topology(client):
    assert client.get("/api/v1/topology", headers={"X-Opsgraph-Token": "wrong"}).status_code == 401
    topology = client.get("/api/v1/topology").json()
    assert len(topology["services"]) == 8
    assert len(topology["stores"]) == 30
    assert len(topology["edges"]) == 7
    GraphRepository().seed()
    assert len(client.get("/api/v1/topology").json()["services"]) == 8


@pytest.mark.parametrize("scenario", ["healthy", "timeout", "deployment"])
def test_payment_workflow(client, scenario):
    session, pid = str(uuid4()), str(uuid4())
    body = {"id": pid, "session_id": session, "product": 0, "scenario": scenario}
    response = client.post("/api/v1/mock-payments", json=body)
    assert response.status_code == 200, response.text
    state = response.json()
    assert state["phase"] == ("approved" if scenario == "healthy" else "incident")
    assert all(e["traceId"] == pid for e in state["events"])
    duplicate = client.post("/api/v1/mock-payments", json=body).json()
    assert len(duplicate["events"]) == len(state["events"])
    conflict = client.post("/api/v1/mock-payments", json={**body, "product": 1})
    assert conflict.status_code == 409
    assert client.get(f"/api/v1/state/{uuid4()}").json()["events"] == []
    if scenario != "healthy":
        incident = state["incident"]
        assert set(incident["evidence"]["calculate_blast_radius"]["affected"]) == {
            "bank-connector",
            "payment-service",
            "order-service",
            "api-gateway",
        }
        assert len(incident["steps"]) == 5
        assert incident["summary"]["evidence_refs"]
        deploys = incident["evidence"]["get_recent_deployments"]["deployments"]
        assert bool(deploys) == (scenario == "deployment")
        assert (
            client.post(
                f"/api/v1/incidents/{pid}/actions",
                json={"session_id": str(uuid4()), "action": "simulate_recovery"},
            ).status_code
            == 409
        )
        resolved = client.post(
            f"/api/v1/incidents/{pid}/actions",
            json={"session_id": session, "action": "simulate_recovery"},
        ).json()
        assert resolved["phase"] == "resolved"
        assert not any(e["type"] == "payment.approved" for e in resolved["events"])
        again = client.post(
            f"/api/v1/incidents/{pid}/actions",
            json={"session_id": session, "action": "simulate_recovery"},
        )
        assert again.status_code == 409


def test_no_arbitrary_fields(client):
    response = client.post(
        "/api/v1/mock-payments",
        json={
            "id": str(uuid4()),
            "session_id": str(uuid4()),
            "scenario": "healthy",
            "cypher": "MATCH(n) DELETE n",
        },
    )
    assert response.status_code == 422
