import asyncio
import json
import logging
import urllib.request
from contextlib import asynccontextmanager
from typing import Annotated
from uuid import UUID

from fastapi import Depends, FastAPI, HTTPException
from fastapi.responses import JSONResponse

from app.application.chat import ChatWorkflow
from app.application.workflow import PaymentWorkflow
from app.core.auth import current_user, login_user, require_role, service_token
from app.core.config import get_settings
from app.domain.models import ActionRequest, BatchRequest, ChatRequest, PaymentRequest
from app.infrastructure.graph import GraphRepository

logger = logging.getLogger("opsgraph")
logging.basicConfig(level=logging.INFO)
# Deliberately bounded local MVP: one worker, one active investigation at a time.
gate = asyncio.Lock()


@asynccontextmanager
async def lifespan(app):
    repo = GraphRepository()
    repo.seed()
    repo.query("MATCH (p:Payment) WHERE p.phase='processing' SET p.phase='error'")
    repo.query("MATCH (i:Incident) WHERE i.status='investigating' SET i.status='interrupted'")
    yield


app = FastAPI(title="OpsGraph API", version="0.1.0", lifespan=lifespan)


@app.exception_handler(Exception)
async def unexpected(request, exc):
    logger.error("request_failed path=%s type=%s", request.url.path, type(exc).__name__)
    return JSONResponse(
        status_code=503,
        content={"detail": "Backend dependency unavailable. Inspect local service logs."},
    )


@app.get("/health/live")
def live():
    return {"status": "ok"}


@app.get("/health/ready", dependencies=[Depends(service_token)])
def ready():
    if len(GraphRepository().topology()["services"]) != 8:
        raise HTTPException(503, "Graph seed unavailable")
    s = get_settings()
    return {
        "status": "ready",
        "graph": "connected",
        "model_provider": s.model_provider,
        "model": s.model_name,
        "model_status": "configured_not_probed",
        "mcp": "private-stdio",
    }


@app.post("/auth/login", dependencies=[Depends(service_token)])
def login(body: dict):
    username = body.get("username", "")
    password = body.get("password", "")
    if not isinstance(username, str) or not isinstance(password, str):
        raise HTTPException(400, "Invalid credentials")
    return login_user(username, password)


@app.get("/auth/me")
def me(user: Annotated[dict, Depends(current_user)]):
    return {"user": user}


@app.get("/api/v1/topology", dependencies=[Depends(require_role("admin", "operator", "viewer"))])
def topology():
    return GraphRepository().topology()


@app.get("/api/v1/metrics", dependencies=[Depends(require_role("admin", "operator", "viewer"))])
def metrics():
    return GraphRepository().metrics()


@app.get("/api/v1/model/status", dependencies=[Depends(require_role("admin"))])
def model_status():
    settings = get_settings()
    available = False
    if settings.model_provider == "ollama":
        try:
            with urllib.request.urlopen(
                settings.ollama_base_url.rstrip("/") + "/api/tags", timeout=3
            ) as response:
                tags = json.load(response).get("models", [])
            available = any(
                item.get("name") == settings.model_name or item.get("model") == settings.model_name
                for item in tags
            )
        except (OSError, ValueError, json.JSONDecodeError):
            logger.info("ollama_model_probe_unavailable")
    return {
        "provider": settings.model_provider,
        "model": settings.model_name,
        "local_model_available": available,
    }


@app.post("/api/v1/chat", dependencies=[Depends(require_role("admin"))])
async def chat(body: ChatRequest):
    return await ChatWorkflow(body.model_choice).answer(str(body.session_id), body.question)


@app.get("/api/v1/chat/history/{session_id}", dependencies=[Depends(require_role("admin"))])
def chat_history(session_id: UUID):
    history = GraphRepository().chat_history(str(session_id))
    last = history[-1] if history else None
    return {
        "history": history,
        "answer": last["answer"] if last else "",
        "evidence_refs": last["refs"] if last else [],
        "uncertainties": [],
        "provider_status": last["provider"] if last else "not_started",
        "model": get_settings().model_name,
    }


@app.get(
    "/api/v1/state/{session_id}",
    dependencies=[Depends(require_role("admin", "operator", "viewer"))],
)
def state(session_id: UUID):
    return GraphRepository().snapshot(str(session_id))


@app.post("/api/v1/mock-payments", dependencies=[Depends(require_role("admin", "operator"))])
async def payment(body: PaymentRequest):
    if gate.locked():
        raise HTTPException(
            429, "An investigation is already running. Retry with the same request ID."
        )
    async with gate:
        try:
            return await PaymentWorkflow().run(body)
        except ValueError as exc:
            raise HTTPException(409, str(exc)) from exc


@app.post("/api/v1/mock-payments/batch", dependencies=[Depends(require_role("admin"))])
async def batch_payments(body: BatchRequest):
    if gate.locked():
        raise HTTPException(429, "An investigation is already running")
    async with gate:
        try:
            return await PaymentWorkflow().batch(body)
        except ValueError as exc:
            raise HTTPException(409, str(exc)) from exc


@app.post("/api/v1/incidents/{incident_id}/actions", dependencies=[Depends(require_role("admin"))])
async def action(incident_id: UUID, body: ActionRequest):
    repo = GraphRepository()
    current = repo.snapshot(str(body.session_id))
    if current.get("paymentId") != str(incident_id) or current.get("phase") != "incident":
        raise HTTPException(409, "Incident not open for this session")
    # Require a fresh graph-backed agent check before changing incident state.
    workflow = PaymentWorkflow(repo)
    await workflow.validate_recovery(str(incident_id))
    resolved = repo.recover_batch(str(body.session_id))
    if not resolved:
        current = repo.snapshot(str(body.session_id))
        if current.get("paymentId") != str(incident_id) or current["phase"] != "resolved":
            raise HTTPException(409, "Incident not open for this session")
    return repo.snapshot(str(body.session_id))
