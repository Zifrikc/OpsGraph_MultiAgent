# FalkorDB graph data model and queries

This document describes the **implemented synthetic graph**, not the larger product ideas in `docs/product/SPEC.md`. FalkorDB is the primary database for the demo. The payment, incident, event, and agent workflows read and write it directly; the investigation cannot run without it.

The graph also serves as a focused operations knowledge base for Track 03: it connects service ownership, deployments, historical incidents, runbooks, current incident evidence, and admin conversation history. These sources are seeded or produced by the demo; external company documents, tickets, and chat systems are not connected.

## Nodes and directed relationships

| Node | Key properties | Purpose |
| --- | --- | --- |
| `Store` | `id`, `label`, `region` | Thirty fictional shops sharing one platform |
| `Service` | `id`, `label`, `kind`, `owner`, `x`, `y`, `latency` | Eight logical microservices; the coordinates are only for rendering |
| `Team` | `name` | Service ownership |
| `Payment` | `id`, `session`, `store`, `scenario`, `product`, `phase`, `created` | A simulated checkout and its current outcome |
| `Event` | `id`, `payload`, `timestamp` | A JSON trace event emitted by one mock payment |
| `Incident` | `id`, `status`, `scenario`, `evidence`, `summary`, `provider_status` | Investigation state and cited results |
| `AgentStep` | `id`, `agent`, `tool`, `result`, `mode`, `timestamp` | Persistent triage, investigator, and recovery steps |
| `Runbook`, `RunbookChunk` | `id`, `title`, `action` or `text` | Recovery guidance and retrieval fragments |
| `HistoricalIncident`, `Deployment` | `id`, `summary` or `minutesBefore` | Synthetic investigation context |
| `ChatTurn` | `id`, `session`, `question`, `answer`, `refs`, `provider`, `created` | Persistent admin chat history |

```text
(Store)-[:USES]->(Service:api-gateway)
(Service)-[:DEPENDS_ON]->(Service)       consumer → dependency
(Service)-[:OWNED_BY]->(Team)
(Service:order-service)-[:EMITS_TO]->(Service:notification-service)
(Payment)-[:EMITTED]->(Event)
(Payment)-[:CAUSED]->(Incident)-[:ORIGIN]->(Service:bank-connector)
(Incident)-[:HAS_STEP]->(AgentStep)
(Incident)-[:CORRELATED_WITH]->(Deployment)-[:CHANGED]->(Service)
(Service)-[:HAS_RUNBOOK]->(Runbook)-[:HAS_CHUNK]->(RunbookChunk)
(HistoricalIncident)-[:AFFECTED]->(Service)
```

The seed uses `MERGE`, and indexed `id` properties make repeated startup safe. Payment IDs are UUID idempotency keys. Incidents and steps remain in FalkorDB across browser refreshes. The thirty-store batch writes a failed payment and trace for each shop; the thirtieth incident runs the full representative investigation.

## Queries that drive the product

**Multi-hop blast radius:** follow dependency edges from every consumer toward the failed connector. The path returns concrete service IDs for the agent and UI. The four-hop and 30-path bounds keep the demo query predictable.

```cypher
MATCH p=(s:Service)-[:DEPENDS_ON*0..4]->(origin:Service {id:$id})
RETURN s.id, [n IN nodes(p) | n.id]
LIMIT 30
```

**Find the owner and the relevant runbook:**

```cypher
MATCH (:Service {id:$id})-[:OWNED_BY]->(t:Team)
RETURN t.name LIMIT 5

MATCH (:Service {id:$id})-[:HAS_RUNBOOK]->(r:Runbook)
RETURN r.id, r.title, r.action LIMIT 5
```

**Persisted agent handoff:** the investigator reads the triage agent's recorded tool results rather than an in-memory variable.

```cypher
MATCH (:Incident {id:$id})-[:HAS_STEP]->(s:AgentStep)
WHERE s.agent='triage-agent'
RETURN s.tool, s.result
```

**Rebuild the event stream and current session state:**

```cypher
MATCH (p:Payment {session:$session})-[:EMITTED]->(e:Event)
RETURN e.payload ORDER BY e.timestamp DESC LIMIT 500

MATCH (p:Payment {session:$session})
RETURN p.id, p.phase, p.scenario, p.product, p.store
ORDER BY p.created DESC LIMIT 1
```

**Validate and apply a simulated recovery:** the recovery agent first calls the MCP runbook tool. Only after RB-007 is found does the backend update open incidents in the session; the action is recorded as new events and an `AgentStep`.

```cypher
MATCH (p:Payment {session:$session})-[:CAUSED]->(i:Incident)
WHERE i.status='open'
SET i.status='resolved', p.phase='resolved'
RETURN p.id
```

The allowlisted MCP implementations are in [`apps/api/app/presentation/mcp/server.py`](../../apps/api/app/presentation/mcp/server.py). Graph seeding, event persistence, metrics, and state reconstruction are in [`apps/api/app/infrastructure/graph.py`](../../apps/api/app/infrastructure/graph.py). The product does not expose arbitrary Cypher execution to an LLM or the browser.
