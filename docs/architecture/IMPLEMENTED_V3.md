# Implemented demo architecture — V3

## Runtime graph

FalkorDB contains 30 `Store` nodes connected to `api-gateway` through `USES`, eight shared `Service` nodes with service dependency edges, and `Payment`, `Event`, `Incident`, `AgentStep`, `Runbook`, and `RunbookChunk` nodes. The Graph Explorer displays the operational subset (stores and services) with movable positions and a two-second polling refresh. FalkorDB Browser is a separate administrative graph UI and is not bundled in this app.

## Agent workflow

For a timeout, `PaymentWorkflow` writes the payment trace and incident. The triage agent calls allowlisted MCP tools for blast radius and ownership. The investigator reads the persisted triage steps, calls deployment, historical-incident, and runbook tools, then writes a sourced summary. A model may help select tools and summarize; invalid, absent, or timed-out inference uses an explicitly labeled deterministic path. The recovery action first calls the runbook MCP tool as a `recovery-agent`, saves its validation step and event, and only then changes incident states. This is application-level agent coordination; the A2A protocol is not implemented.

## Thirty-store fixture

The admin batch endpoint writes one failed mock payment and events per store in a new browser session. The first 29 payments receive a shared-investigation marker and the thirtieth runs the complete MCP investigation. The endpoint is serialized with a process-local lock. Recovery marks the open incidents in that session resolved and emits audit events for each. No failed payment is retried, no real bank is contacted, and the batch is not a load test.

## Model selection

`ModelChoice` is accepted on chat and payment requests. The choice can be server default, local Ollama, Gemini, Claude, or OpenAI. The browser holds provider, model ID, and key in React memory only. The key travels through the same-origin Next.js proxy to FastAPI and is not inserted into FalkorDB or chat history. The server default is configured by environment variables; `GET /api/v1/model/status` probes whether the configured Ollama model appears in `/api/tags`. A successful provider response is schema-checked and its graph references are validated against retrieved evidence before it appears as AI output.

## Deployment boundary

The API and web Dockerfiles accept Cloud Run's `PORT`. A Cloud Run deployment still needs an external persistent FalkorDB service, private connectivity, TLS, Secret Manager, a strong admin password, a public `APP_ORIGIN`, and a chosen cloud model or deterministic mode. `host.docker.internal` is only for local Docker Desktop. The current local demo accounts and process lock are not production multi-tenant controls.

The root `Makefile` wraps local setup, Compose, checks, and an optional Cloud Run plan/deploy. `cloudbuild.yaml` builds and publishes API and web images. Environment-specific `.env.cloudrun.*.example` and `.env.deploy.*.example` files are non-secret templates; actual values and Secret Manager resources are supplied by the deployment owner. The deployment script does nothing to Google Cloud without `--apply`. See `docs/operations/DEPLOYMENT.md` for prerequisites and limits.
