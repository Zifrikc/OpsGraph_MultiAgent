import json
from datetime import UTC, datetime
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
STORES = [
    ("store-centro", "Tienda Centro", "Lima"),
    ("store-norte", "Tienda Norte", "Trujillo"),
    ("store-sur", "Tienda Sur", "Arequipa"),
]
STORES += [(f"store-{i:02d}", f"Store {i:02d}", "Peru · demo") for i in range(4, 31)]


def now():
    return datetime.now(UTC).isoformat()


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
        for label in ["Service", "Store", "Payment", "Incident", "Event", "AgentStep"]:
            if not any(row[0] == label and "id" in row[1] for row in existing):
                self.query(f"CREATE INDEX FOR (n:{label}) ON (n.id)")
        for id_, label, kind, owner, x, y, latency in SERVICES:
            self.query(
                "MERGE (s:Service {id:$id}) SET s.label=$label, s.kind=$kind, "
                "s.x=$x, s.y=$y, s.latency=$latency, s.owner=$owner "
                "MERGE (t:Team {name:$owner}) MERGE (s)-[:OWNED_BY]->(t)",
                {
                    "id": id_,
                    "label": label,
                    "kind": kind,
                    "owner": owner,
                    "x": x,
                    "y": y,
                    "latency": latency,
                },
            )
        for a, b in EDGES:
            self.query(
                "MATCH (a:Service {id:$a}), (b:Service {id:$b}) MERGE (a)-[:DEPENDS_ON]->(b)",
                {"a": SERVICES[a][0], "b": SERVICES[b][0]},
            )
        for store_id, label, region in STORES:
            self.query(
                "MERGE (t:Store {id:$id}) SET t.label=$label,t.region=$region "
                "WITH t MATCH (s:Service {id:'api-gateway'}) MERGE (t)-[:USES]->(s)",
                {"id": store_id, "label": label, "region": region},
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
        chunks = [
            (
                "RB-007:1",
                "Timeout bancario",
                "Un timeout del bank-connector deja el pago sin aprobar. Revisar dependencias y tasa de fallos antes de proponer recuperación.",
            ),
            (
                "RB-007:2",
                "Recuperación simulada",
                "El operador puede aprobar un cambio simulado a proveedor alternativo. El pago anterior no se reintenta ni se marca como aprobado.",
            ),
            (
                "RB-007:3",
                "Evidencia",
                "Un despliegue reciente está correlacionado temporalmente, pero no demuestra por sí solo que causó el timeout.",
            ),
        ]
        for chunk_id, title, text in chunks:
            self.query(
                "MATCH (r:Runbook {id:'RB-007'}) "
                "MERGE (c:RunbookChunk {id:$id}) SET c.title=$title,c.text=$text "
                "MERGE (r)-[:HAS_CHUNK]->(c)",
                {"id": chunk_id, "title": title, "text": text},
            )

    def topology(self):
        stores = self.query(
            "MATCH (t:Store) RETURN t.id,t.label,t.region ORDER BY t.id", readonly=True
        )
        nodes = self.query(
            "MATCH (s:Service) RETURN s.id,s.label,s.kind,s.owner,s.x,s.y,s.latency ORDER BY s.id",
            readonly=True,
        )
        edges = self.query(
            "MATCH (a:Service)-[r]->(b:Service) RETURN a.id,b.id,type(r)", readonly=True
        )
        return {
            "stores": [dict(zip(["id", "label", "region"], r)) for r in stores],
            "services": [
                dict(zip(["id", "label", "kind", "owner", "x", "y", "latency"], r)) for r in nodes
            ],
            "edges": [{"source": r[0], "target": r[1], "type": r[2]} for r in edges],
        }

    def metrics(self):
        payments = self.query(
            "MATCH (p:Payment) RETURN p.store,p.phase,p.created ORDER BY p.created DESC LIMIT 1000",
            readonly=True,
        )
        events = self.query(
            "MATCH (e:Event) RETURN e.payload ORDER BY e.timestamp DESC LIMIT 1000",
            readonly=True,
        )
        stores = {
            store_id: {
                "id": store_id,
                "label": label,
                "total": 0,
                "approved": 0,
                "incidents": 0,
                "active": 0,
            }
            for store_id, label, _ in STORES
        }
        for store_id, phase, _ in payments:
            item = stores.get(store_id or "store-centro")
            if item:
                item["total"] += 1
                item["approved"] += phase == "approved"
                item["incidents"] += phase in {"incident", "resolved", "error"}
                item["active"] += phase == "incident"
        services = {
            row[0]: {"id": row[0], "label": row[1], "events": 0, "errors": 0}
            for row in self.query("MATCH (s:Service) RETURN s.id,s.label", readonly=True)
        }
        for (payload,) in events:
            event = json.loads(payload)
            item = services.get(event.get("service"))
            if item:
                item["events"] += 1
                item["errors"] += event["type"] in {"bank.timeout", "workflow.failed"}
        return {
            "stores": list(stores.values()),
            "services": list(services.values()),
            "total": len(payments),
            "approved": sum(p[1] == "approved" for p in payments),
            "incidents": sum(p[1] in {"incident", "resolved", "error"} for p in payments),
            "scope": "Últimos 1.000 pagos y 1.000 eventos ficticios",
        }

    def runbook_chunks(self, question):
        rows = self.query("MATCH (c:RunbookChunk) RETURN c.id,c.title,c.text", readonly=True)
        terms = {word.strip(".,:;?¿¡!").casefold() for word in question.split() if len(word) > 3}
        scored = sorted(
            rows,
            key=lambda row: sum(term in (row[1] + " " + row[2]).casefold() for term in terms),
            reverse=True,
        )
        return [{"ref": "runbook:" + row[0], "title": row[1], "text": row[2]} for row in scored[:3]]

    def chat_history(self, session):
        rows = self.query(
            "MATCH (t:ChatTurn {session:$session}) RETURN t.question,t.answer,t.refs,t.provider,t.created "
            "ORDER BY t.created DESC LIMIT 6",
            {"session": session},
            readonly=True,
        )
        return [
            {"question": row[0], "answer": row[1], "refs": json.loads(row[2]), "provider": row[3]}
            for row in reversed(rows)
        ]

    def save_chat(self, session, question, answer, refs, provider):
        self.query(
            "CREATE (t:ChatTurn {id:$id,session:$session,question:$question,answer:$answer,"
            "refs:$refs,provider:$provider,created:$created})",
            {
                "id": str(uuid4()),
                "session": session,
                "question": question,
                "answer": answer,
                "refs": json.dumps(refs),
                "provider": provider,
                "created": now(),
            },
        )

    def claim(self, request):
        claim = str(uuid4())
        rows = self.query(
            "MERGE (p:Payment {id:$id}) ON CREATE SET p.session=$session, "
            "p.claim=$claim,p.scenario=$scenario,p.product=$product,p.store=$store,p.created=$created, "
            "p.phase='processing' RETURN p.claim,p.session,p.scenario,p.product,p.store",
            {
                "id": str(request.id),
                "session": str(request.session_id),
                "claim": claim,
                "scenario": request.scenario,
                "product": request.product,
                "store": request.store_id,
                "created": now(),
            },
        )
        row = rows[0]
        if row[1:] != [
            str(request.session_id),
            request.scenario,
            request.product,
            request.store_id,
        ]:
            raise ValueError("Idempotency key already used for a different request")
        return row[0] == claim

    def phase(self, payment_id, phase):
        self.query(
            "MATCH (p:Payment {id:$id}) SET p.phase=$phase", {"id": payment_id, "phase": phase}
        )

    def event(self, payment_id, type_, service, data=None):
        stores = self.query(
            "MATCH (p:Payment {id:$id}) RETURN p.store", {"id": payment_id}, readonly=True
        )
        store_id = stores[0][0] if stores else "store-centro"
        e = {
            "id": str(uuid4()),
            "timestamp": now(),
            "type": type_,
            "service": service,
            "traceId": payment_id,
            "data": {"simulated": True, "storeId": store_id, **(data or {})},
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
            "MATCH (p:Payment {session:$session}) RETURN p.id,p.phase,p.scenario,p.product,p.store "
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
        id_, phase, scenario, product, store_id = payments[0]
        result.update(
            paymentId=id_,
            phase=phase,
            scenario=scenario,
            product=product,
            storeId=store_id or "store-centro",
        )
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

    def recover_batch(self, session):
        rows = self.query(
            "MATCH (p:Payment {session:$session})-[:CAUSED]->(i:Incident) "
            "WHERE i.status='open' SET i.status='resolved',p.phase='resolved' RETURN p.id",
            {"session": session},
        )
        for (payment_id,) in rows:
            self.event(payment_id, "runbook.approved", "operator", {"runbook": "RB-007"})
            self.event(
                payment_id, "incident.resolved", "payment-service", {"paymentRetried": False}
            )
        return len(rows)
