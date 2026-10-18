import asyncio
import hmac
import logging
from contextlib import asynccontextmanager
from uuid import UUID
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.responses import JSONResponse
from app.core.config import get_settings
from app.domain.models import PaymentRequest, ActionRequest
from app.infrastructure.graph import GraphRepository
from app.application.workflow import PaymentWorkflow

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


def authorize(x_opsgraph_token: str = Header(default="")):
    if not hmac.compare_digest(x_opsgraph_token, get_settings().api_token.get_secret_value()):
        raise HTTPException(401, "Unauthorized")


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


@app.get("/health/ready", dependencies=[Depends(authorize)])
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


@app.get("/api/v1/topology", dependencies=[Depends(authorize)])
def topology():
    return GraphRepository().topology()


@app.get("/api/v1/state/{session_id}", dependencies=[Depends(authorize)])
def state(session_id: UUID):
    return GraphRepository().snapshot(str(session_id))


@app.post("/api/v1/mock-payments", dependencies=[Depends(authorize)])
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


@app.post("/api/v1/incidents/{incident_id}/actions", dependencies=[Depends(authorize)])
def action(incident_id: UUID, body: ActionRequest):
    repo = GraphRepository()
    if not repo.recover(str(incident_id), str(body.session_id)):
        current = repo.snapshot(str(body.session_id))
        if current.get("paymentId") != str(incident_id) or current["phase"] != "resolved":
            raise HTTPException(409, "Incident not open for this session")
    return repo.snapshot(str(body.session_id))
