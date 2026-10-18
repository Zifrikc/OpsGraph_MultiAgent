import json
from datetime import datetime, timezone
from uuid import uuid4
from falkordb import FalkorDB
from app.core.config import get_settings

SERVICES = [
    ("api-gateway", "API Gateway", "Entrada", "Platform", 150, 230, 24),
    ("authentication-service", "Authentication", "Identidad", "Platform", 340, 90, 18),
    ("order-service", "Orders", "Comercio", "Commerce", 340, 300, 42),
    ("payment-service", "Payments", "Pagos", "Payments", 540, 230, 65),
    ("fraud-detection-service", "Fraud detection", "Riesgo", "Risk", 540, 440, 32),
    ("bank-connector", "Bank connector", "Proveedor externo", "Payments", 760, 150, 86),
    ("transaction-database", "Transactions DB", "Persistencia", "Data", 760, 340, 12),
    ("notification-service", "Notifications", "Mensajería", "Platform", 340, 490, 21),
]
EDGES = [(0, 1), (0, 2), (2, 3), (3, 4), (3, 5), (3, 6)]


def now():
    return datetime.now(timezone.utc).isoformat()


class GraphRepository:
    def __init__(self):
        s = get_settings()
        self.db = FalkorDB(
            host=s.falkordb_host,
            port=s.falkordb_port,
            username=s.falkordb_username,
            password=s.falkordb_password.get_secret_value(),
            ssl=s.falkordb_ssl,
            socket_timeout=10,
            socket_connect_timeout=5,
        )
        self.graph = self.db.select_graph(s.falkordb_graph)

    def query(self, cypher, params=None, readonly=False):
        method = self.graph.ro_query if readonly else self.graph.query
        return method(cypher, params or {}).result_set

    def seed(self):
        existing = self.query("CALL db.indexes() YIELD label, properties RETURN label, properties")
        for label in ["Service", "Payment", "Incident", "Event", "AgentStep"]:
            if not any(row[0] == label and "id" in row[1] for row in existing):
                self.query(f"CREATE INDEX FOR (n:{label}) ON (n.id)")
        for id_, label, kind, owner, x, y, latency in SERVICES:
            self.query(
                "MERGE (s:Service {id:$id}) SET s.label=$label, s.kind=$kind, "
                "s.x=$x, s.y=$y, s.latency=$latency, s.owner=$owner "
                "MERGE (t:Team {name:$owner}) MERGE (s)-[:OWNED_BY]->(t)",
                dict(id=id_, label=label, kind=kind, owner=owner, x=x, y=y, latency=latency),
            )
        for a, b in EDGES:
            self.query(
                "MATCH (a:Service {id:$a}), (b:Service {id:$b}) MERGE (a)-[:DEPENDS_ON]->(b)",
                {"a": SERVICES[a][0], "b": SERVICES[b][0]},
            )
        self.query(
            "MATCH (a:Service {id:'order-service'}),(b:Service {id:'notification-service'}) "
            "MERGE (a)-[:EMITS_TO]->(b)"
        )
        self.query(
            "MATCH (s:Service {id:'bank-connector'}) "
            "MERGE (r:Runbook {id:'RB-007'}) SET r.title='Recuperar conector', "
            "r.action='switch-to-mock-fallback' MERGE (s)-[:HAS_RUNBOOK]->(r) "
            "MERGE (h:HistoricalIncident {id:'HIST-017'}) "
            "SET h.summary='Timeout bancario previo; proveedor alternativo simulado' "
            "MERGE (h)-[:AFFECTED]->(s)"
        )

    def topology(self):
        nodes = self.query(
            "MATCH (s:Service) RETURN s.id,s.label,s.kind,s.owner,s.x,s.y,s.latency ORDER BY s.id",
            readonly=True,
        )
        edges = self.query(
            "MATCH (a:Service)-[r]->(b:Service) RETURN a.id,b.id,type(r)", readonly=True
        )
        return {
            "services": [
                dict(zip(["id", "label", "kind", "owner", "x", "y", "latency"], r)) for r in nodes
            ],
            "edges": [{"source": r[0], "target": r[1], "type": r[2]} for r in edges],
        }

    def claim(self, request):
        claim = str(uuid4())
        rows = self.query(
            "MERGE (p:Payment {id:$id}) ON CREATE SET p.session=$session, "
            "p.claim=$claim,p.scenario=$scenario,p.product=$product,p.created=$created, "
            "p.phase='processing' RETURN p.claim,p.session,p.scenario,p.product",
            {
                "id": str(request.id),
                "session": str(request.session_id),
                "claim": claim,
                "scenario": request.scenario,
                "product": request.product,
                "created": now(),
            },
        )
        row = rows[0]
        if row[1:] != [str(request.session_id), request.scenario, request.product]:
            raise ValueError("Idempotency key already used for a different request")
        return row[0] == claim

    def phase(self, payment_id, phase):
        self.query(
            "MATCH (p:Payment {id:$id}) SET p.phase=$phase", {"id": payment_id, "phase": phase}
        )

    def event(self, payment_id, type_, service, data=None):
        e = {
            "id": str(uuid4()),
            "timestamp": now(),
            "type": type_,
            "service": service,
            "traceId": payment_id,
            "data": {"simulated": True, **(data or {})},
        }
        self.query(
            "MATCH (p:Payment {id:$payment}) CREATE (e:Event {id:$id, payload:$payload, "
            "timestamp:$timestamp}) CREATE (p)-[:EMITTED]->(e)",
            {
                "payment": payment_id,
                "id": e["id"],
                "payload": json.dumps(e),
                "timestamp": e["timestamp"],
            },
        )

    def open_incident(self, payment_id, scenario):
        self.query(
            "MATCH (p:Payment {id:$id}), (s:Service {id:'bank-connector'}) "
            "MERGE (i:Incident {id:$id}) SET i.status='investigating',i.scenario=$scenario "
            "MERGE (p)-[:CAUSED]->(i) MERGE (i)-[:ORIGIN]->(s)",
            {"id": payment_id, "scenario": scenario},
        )
        if scenario == "deployment":
            self.query(
                "MATCH (i:Incident {id:$id}), (s:Service {id:'bank-connector'}) "
                "MERGE (d:Deployment {id:$deploy}) SET d.minutesBefore=12, d.fixture=true "
                "MERGE (d)-[:CHANGED]->(s) MERGE (i)-[:CORRELATED_WITH]->(d)",
                {"id": payment_id, "deploy": f"dep-pay-{payment_id[:8]}"},
            )

    def step(self, incident_id, agent, tool, result, mode):
        self.query(
            "MATCH (i:Incident {id:$incident}) CREATE (a:AgentStep {id:$id, "
            "agent:$agent,tool:$tool,result:$result,mode:$mode,timestamp:$timestamp}) "
            "CREATE (i)-[:HAS_STEP]->(a)",
            {
                "incident": incident_id,
                "id": str(uuid4()),
                "agent": agent,
                "tool": tool,
                "result": json.dumps(result),
                "mode": mode,
                "timestamp": now(),
            },
        )

    def finish(self, id_, evidence, summary, provider_status):
        self.query(
            "MATCH (i:Incident {id:$id}) SET i.status='open',i.evidence=$evidence, "
            "i.summary=$summary,i.provider_status=$status",
            {
                "id": id_,
                "evidence": json.dumps(evidence),
                "summary": json.dumps(summary),
                "status": provider_status,
            },
        )
        self.phase(id_, "incident")

    def snapshot(self, session):
        payments = self.query(
            "MATCH (p:Payment {session:$session}) RETURN p.id,p.phase,p.scenario,p.product "
            "ORDER BY p.created DESC LIMIT 1",
            {"session": session},
            True,
        )
        events = self.query(
            "MATCH (p:Payment {session:$session})-[:EMITTED]->(e:Event) "
            "RETURN e.payload ORDER BY e.timestamp DESC LIMIT 500",
            {"session": session},
            True,
        )
        result = {
            "phase": "idle",
            "events": [json.loads(r[0]) for r in reversed(events)],
            "incident": None,
        }
        if not payments:
            return result
        id_, phase, scenario, product = payments[0]
        result.update(paymentId=id_, phase=phase, scenario=scenario, product=product)
        incident = self.query(
            "MATCH (i:Incident {id:$id}) RETURN i.status,i.evidence,i.summary,i.provider_status",
            {"id": id_},
            True,
        )
        if incident:
            row = incident[0]
            steps = self.query(
                "MATCH (:Incident {id:$id})-[:HAS_STEP]->(s:AgentStep) "
                "RETURN s.agent,s.tool,s.result,s.mode ORDER BY s.timestamp",
                {"id": id_},
                True,
            )
            result["incident"] = {
                "id": id_,
                "status": row[0],
                "evidence": json.loads(row[1] or "{}"),
                "summary": json.loads(row[2] or "{}"),
                "provider_status": row[3],
                "steps": [
                    {"agent": s[0], "tool": s[1], "result": json.loads(s[2]), "mode": s[3]}
                    for s in steps
                ],
            }
        return result

    def recover(self, id_, session):
        rows = self.query(
            "MATCH (p:Payment {id:$id,session:$session})-[:CAUSED]->(i:Incident) "
            "WHERE i.status='open' SET i.status='resolved',p.phase='resolved' RETURN i.id",
            {"id": id_, "session": session},
        )
        if rows:
            self.event(id_, "runbook.approved", "operator", {"runbook": "RB-007"})
            self.event(id_, "incident.resolved", "payment-service", {"paymentRetried": False})
        return bool(rows)
