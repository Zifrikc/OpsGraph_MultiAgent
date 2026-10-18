# OpsGraph AI

OpsGraph AI is a hackathon demo of connected operations. A simulated POS payment produces events across eight shared services. FalkorDB stores stores, services, dependencies, payments, incidents, agent steps, runbooks, and event traces. A triage agent hands persisted graph evidence to an investigator agent through private MCP tools. The operator can inspect the graph and approve a simulated recovery after another agent checks the runbook.

**All stores, payments, bank responses, incidents, and recovery actions are fictional. No card data or real payments are processed.**

**Hackathon tracks:** Track 01 — Agents That Act on Connected Data; Track 03 — Company Brain. The Track 03 scope is an operations knowledge graph for this synthetic retail platform, not a general connector for every company document or chat system. FalkorDB is essential to both workflows: it stores connected context, source-linked operational knowledge, and investigation state.

## Judge quick start

Install Docker Desktop with Linux containers. Clone the repository and start the three containers. On Windows PowerShell:

```powershell
git clone https://github.com/Zifrikc/OpsGraph_MultiAgent.git
cd OpsGraph_MultiAgent
powershell -ExecutionPolicy Bypass -File scripts/setup.ps1
docker compose up -d --build
```

On Linux or macOS, install Docker Compose and OpenSSL, then run `sh scripts/setup.sh` followed by `docker compose up -d --build` from the repository root. Both setup scripts create an untracked `.env` with local database and application secrets; they do not require a FalkorDB Cloud account.

Open `http://localhost:3000` (or the port set by `WEB_PORT` in `.env`). Use **admin / admin** in the local demo. The login screen has a button that reveals these demo credentials. `operator` and `viewer` passwords are generated in the untracked `.env` file. Never reuse the demo admin password in a public deployment; set `ADMIN_PASSWORD` to a strong secret through Google Secret Manager or the deployment environment.

`docker compose ps` shows the API, web, and FalkorDB containers. The FalkorDB port is bound to localhost only. Run `docker compose logs --tail 50 api` if the backend is unavailable.

If GNU Make is installed, the root [Makefile](Makefile) provides `make setup`, `make up`, `make status`, `make logs`, `make down`, and `make check`. These wrap the same scripts and Compose commands; Make is optional for judges.

### Option A: use a cloud model, no Ollama required

1. Start the containers as above and sign in as admin.
2. Open **Agent Console → Model connection**. Select **Gemini API**, **Claude API**, or **OpenAI API**.
3. Enter a model ID allowed by your account (or leave the field blank for the application's suggested default) and paste your own API key. The key is held only in this browser tab's memory and sent to the API for requests; it is not saved to `.env` or FalkorDB.
4. Ask a question or switch to **Payment Studio** and trigger a timeout. Your selection also applies to new payment investigations. The **Evidence & Execution** panel shows whether the provider answered or the app used a labeled fallback.

If your account has no API key, the graph, payments, MCP tools, and deterministic incident explanation still work. Never paste an API key into GitHub or a screen recording.

### Option B: use a local Ollama model

1. Install and start Ollama on the host computer. Run `ollama list` to see installed model IDs. The default configuration expects `qwen3.8:27b`, which needs substantial RAM. If you have another installed model, set `MODEL_NAME` in the local `.env` to its exact ID.
2. Keep `MODEL_PROVIDER=ollama` in `.env`, then restart only the API with `docker compose up -d --force-recreate api`.
3. Sign in, open **Agent Console**, and check **Configured locally**. It reports whether the configured model appears in Ollama's `/api/tags` list. A slow or unavailable model produces an explicit deterministic fallback, while graph investigation continues.

For a model-free walkthrough, set `MODEL_PROVIDER=none` in `.env` and recreate the API. This is useful for judges who only want to inspect the graph and agent tool flow.

## Demo path

1. In **Payment Studio**, choose a store and run a healthy payment or a bank timeout. The error modal offers **Open Observability** and **Ask the Agent**.
2. In **Observability**, inspect events, service dependencies, metrics, and the persisted triage → investigator handoff. The evidence comes from allowlisted MCP graph tools.
3. In **Graph Explorer**, drag the background, zoom with the mouse wheel, drag service nodes, filter the affected path, and inspect nodes. Data refreshes every two seconds. This is the OpsGraph product view; [FalkorDB Browser](https://github.com/FalkorDB/falkordb-browser) is a separate database administration UI.
4. As admin, select **Simulate failures in 30 stores**. The scenario writes payment failures and events for every store, opens incidents, and runs one representative agent investigation. Store and service metrics then reflect the shared dependency failure.
5. In the investigation, choose **Validate with agent and recover**. The recovery agent rechecks `RB-007` through MCP, records the validation step, and marks the demo incidents resolved. Failed payments are never retried or approved.
6. Open **Agent Console** to ask about the incident, evidence, and runbook. The response shows its model/provider status and source references. If inference times out or fails validation, a clearly labeled deterministic explanation is shown.

## Model connections

The server default is configured in `.env`, initially `MODEL_PROVIDER=ollama` and `MODEL_NAME=qwen3.8:27b`. The Agent Console checks Ollama's installed model list and reports whether that configured model was found; it does **not** silently pick an arbitrary installed model. The same model choice also applies to payment investigation requests from the current browser session.

Admins can choose **Ollama, Gemini, Claude, or OpenAI** in the Agent Console and enter a model ID and API key. The key is sent only to the backend for that request, held in browser memory, and is neither saved in local storage nor written to FalkorDB. Use HTTPS before entering a key on a remote deployment. You may instead configure Gemini on the server through `GOOGLE_API_KEY`, `MODEL_PROVIDER=google`, and `MODEL_NAME=<available model>` in `.env`.

Provider requests use the official Gemini `generateContent`, Anthropic Messages, and OpenAI Responses APIs. Model IDs and account access can change, so enter a model your account permits. Graph tools and incident persistence still run when no model is available; the UI labels the fallback.

## Architecture and scope

```text
Next.js web UI → FastAPI → FalkorDB
                     ├─ Payment workflow and mock events
                     ├─ Triage agent → persisted handoff → Investigator agent
                     ├─ Private stdio MCP graph tools
                     └─ Ollama / Gemini / Claude / OpenAI model adapter
```

The agent handoff is an **A2A-style application workflow**, not an implementation of the A2A wire protocol or Google ADK. The map displays that handoff during an incident. Runbook retrieval currently ranks FalkorDB chunks by terms and cites graph references; vector embeddings and production RAG are not implemented.

### Why these two tracks

| Track | Implemented evidence | Scope limit |
| --- | --- | --- |
| 01 — Agents That Act on Connected Data | Triage and investigation use bounded multi-hop Cypher paths, allowlisted MCP graph tools, persistent evidence handoff, and a runbook-validated simulated recovery. The UI shows the impact path and source references. | The recovery is a controlled demo action; no real payment is retried or approved. |
| 03 — Company Brain | FalkorDB links stores, services, owning teams, deployment context, historical incidents, runbooks, incident decisions, and chat history. An admin can ask about the current incident and inspect cited graph or runbook evidence. | Knowledge is seeded and scoped to operations. The demo does not ingest arbitrary company documents, tickets, people directories, or external chats; it does not continuously sync external sources. |

Agent coordination here means a triage step is written as an `AgentStep` attached to the incident, then the investigator reads that persisted evidence from FalkorDB. MCP is the graph tool interface. The project does not claim protocol-level A2A interoperability or separate remotely addressable agents. Track 02 features such as persistent steps and chat history support the demo, but Track 02 is not entered.

### Graph data model and Cypher

The implemented graph has `Store`, `Service`, `Team`, `Payment`, `Event`, `Incident`, `AgentStep`, `Runbook`, `RunbookChunk`, `HistoricalIncident`, `Deployment`, and `ChatTurn` nodes. Stores `USES` the API gateway; services point to their dependencies through `DEPENDS_ON`; payments `EMITTED` events and may have `CAUSED` incidents; incidents link to their origin service and persistent agent steps. Runbooks and historical incidents attach to services. The dependency direction is **consumer → dependency**.

The key algorithm is a bounded, four-hop dependency traversal from consumers to a failed service:

```cypher
MATCH p=(s:Service)-[:DEPENDS_ON*0..4]->(origin:Service {id:$id})
RETURN s.id, [n IN nodes(p) | n.id]
LIMIT 30
```

The result drives the blast radius and evidence paths. The investigator also queries owners, recent deployments, historical incidents, and runbooks, then reads the triage agent's persisted `AgentStep` handoff. See the [full graph schema and product Cypher queries](docs/architecture/GRAPH_DATA_MODEL.md), which match the implemented MCP tools.

The demo uses one API worker and one active investigation at a time. The 30-store action is a bounded fixture, not a load test or distributed event bus. Authentication uses local demo accounts and role-based JWT cookies; replace it with a real identity provider before production use.

### AI development disclosure

The team used AI coding assistants to help draft code and documentation. Team members selected the architecture and demo scope, inspected the implementation, ran the application and integration checks, and remain responsible for explaining the graph model, Cypher queries, agent handoff, and technical decisions.

## Google Cloud deployment handoff

The repo includes a build-only [Cloud Build template](cloudbuild.yaml), `.env.cloudrun.*.example` and `.env.deploy.*.example` templates, and explicit Cloud Run deployment scripts for Windows and Unix. Cloud Run instances are ephemeral: host FalkorDB outside those instances with persistent storage, configure connectivity and TLS, put passwords/API keys in Secret Manager, replace `admin/admin`, and set the public `APP_ORIGIN`. Review the [Google Cloud handoff](docs/operations/DEPLOYMENT.md) with the teammate handling GCP. No cloud deployment is performed by this repository's local setup.

## Documentation

- [Implemented V3 architecture](docs/architecture/IMPLEMENTED_V3.md)
- [FalkorDB graph data model and Cypher](docs/architecture/GRAPH_DATA_MODEL.md)
- [Local access](docs/operations/ACCESS_V2.md)
- [FalkorDB setup](docs/operations/FALKORDB_LOCAL.md)
- [Deployment preparation](docs/operations/DEPLOYMENT.md)
- [Product specification](docs/product/SPEC.md)

## 3D asset credit

The POS scene is based on [“1 POS”](https://sketchfab.com/3d-models/1-pos-0d4121c18e4341a0839fc6f20af24b88) by [abhijithsince2002](https://sketchfab.com/abhijithsince2002), licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). The local license file is preserved in `apps/web/public/models/pos/license.txt`.
