import asyncio
import json
import os
import sys
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from app.domain.models import ToolPlan, Summary
from app.infrastructure.graph import GraphRepository
from app.infrastructure.models import ModelGateway


class PaymentWorkflow:
    def __init__(self, repo=None):
        self.repo = repo or GraphRepository()
        self.model = ModelGateway()

    async def run(self, request):
        r = self.repo
        pid = str(request.id)
        if len(r.topology()["services"]) != 8:
            raise RuntimeError("Graph seed unavailable; restart API to initialize")
        current = r.snapshot(str(request.session_id))
        if current["phase"] in {"incident", "processing"} and current.get("paymentId") != pid:
            raise ValueError("Resolve the current incident or start a new session")
        if not r.claim(request):
            return r.snapshot(str(request.session_id))
        try:
            r.event(
                pid,
                "checkout.submitted",
                "api-gateway",
                {"amount": [129, 89, 39][request.product], "currency": "USD"},
            )
            for name, service in [
                ("identity.verified", "authentication-service"),
                ("order.created", "order-service"),
                ("risk.cleared", "fraud-detection-service"),
                ("payment.requested", "payment-service"),
                ("bank.authorization.requested", "bank-connector"),
            ]:
                await asyncio.sleep(0.35)
                r.event(pid, name, service)
            if request.scenario == "healthy":
                for name, service in [
                    ("payment.approved", "bank-connector"),
                    ("transaction.saved", "transaction-database"),
                    ("receipt.sent", "notification-service"),
                ]:
                    r.event(pid, name, service)
                r.phase(pid, "approved")
            else:
                r.event(
                    pid,
                    "bank.timeout",
                    "bank-connector",
                    {"timeoutMs": 5000, "source": "injected-fixture"},
                )
                r.open_incident(pid, request.scenario)
                r.event(pid, "incident.opened", "payment-service", {"incidentId": pid})
                await self.investigate(pid, request.scenario)
        except Exception:
            r.phase(pid, "error")
            r.event(
                pid,
                "workflow.failed",
                "orchestrator",
                {"retry": "Start a new demo payment; no real charge occurred."},
            )
            raise
        return r.snapshot(str(request.session_id))

    async def investigate(self, pid, scenario):
        evidence = {}
        server = StdioServerParameters(
            command=sys.executable, args=["-m", "app.presentation.mcp.server"], env=dict(os.environ)
        )
        async with stdio_client(server) as (read, write):
            async with ClientSession(read, write) as session:
                await session.initialize()
                available = {t.name for t in (await session.list_tools()).tools}
                for agent, allowed, required in [
                    (
                        "triage-agent",
                        ["calculate_blast_radius", "get_owners"],
                        ["calculate_blast_radius"],
                    ),
                    (
                        "investigator-agent",
                        [
                            "get_recent_deployments",
                            "find_similar_incidents",
                            "find_applicable_runbooks",
                        ],
                        ["find_applicable_runbooks"],
                    ),
                ]:
                    # Investigator consumes the persisted triage handoff, not an untracked global.
                    if agent == "investigator-agent":
                        rows = self.repo.query(
                            "MATCH (:Incident {id:$id})-[:HAS_STEP]->(s:AgentStep) "
                            "WHERE s.agent='triage-agent' RETURN s.tool,s.result",
                            {"id": pid},
                            True,
                        )
                        evidence = {row[0]: json.loads(row[1]) for row in rows}
                    plan, mode = await self.model.generate(
                        "Select useful tool names from allowed_tools for this incident. Return JSON tools. "
                        "Do not invent tools or query code.",
                        {
                            "agent": agent,
                            "scenario": scenario,
                            "allowed_tools": allowed,
                            "handoff": evidence,
                        },
                        ToolPlan,
                    )
                    names = list(dict.fromkeys(required + (plan.tools if plan else allowed)))
                    if any(name not in allowed or name not in available for name in names):
                        names, mode = allowed, "invalid_plan_fallback"
                    for name in names:
                        args = (
                            {"incident_id": pid}
                            if name == "get_recent_deployments"
                            else {"service_id": "bank-connector"}
                        )
                        result = await session.call_tool(name, args)
                        if result.isError:
                            raise RuntimeError("Domain MCP tool failed")
                        data = result.structuredContent
                        if data is None:
                            data = json.loads(
                                next(c.text for c in result.content if c.type == "text")
                            )
                        evidence[name] = data
                        self.repo.step(pid, agent, name, data, mode)
                        self.repo.event(
                            pid,
                            "agent.tool.completed",
                            agent,
                            {"tool": name, "mode": mode, "evidence": data},
                        )
                    self.repo.event(
                        pid,
                        "agent.handoff" if agent == "triage-agent" else "investigation.completed",
                        agent,
                        {"mode": mode},
                    )
        refs = [v["ref"] for v in evidence.values() if "ref" in v]
        fallback = Summary(
            summary="Timeout inyectado en bank-connector. El grafo identifica los servicios dependientes y un runbook de recuperación simulada.",
            evidence_refs=refs,
            uncertainties=["Los despliegues correlacionados no prueban causalidad."],
        )
        summary, mode = await self.model.generate(
            "Resume en español la evidencia del incidente. Cita exclusivamente refs presentes. "
            "Distingue correlación de causalidad. Toda infraestructura y pago son ficticios. Return JSON.",
            evidence,
            Summary,
        )
        if (
            not summary
            or not summary.evidence_refs
            or not set(summary.evidence_refs).issubset(refs)
        ):
            summary = fallback
            mode = "deterministic_fallback:" + mode
        self.repo.finish(pid, evidence, summary.model_dump(), mode)
        self.repo.event(
            pid,
            "runbook.proposed",
            "investigator-agent",
            {"runbook": "RB-007", "provider_status": mode},
        )
