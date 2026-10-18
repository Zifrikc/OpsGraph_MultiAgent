# Roadmap de OpsGraph AI

Plan propuesto para dos desarrolladores. El orden prioriza un flujo completo antes de complejidad visual o despliegue.

## P0 — demo funcional

1. **Contrato y grafo:** definir los ocho servicios simulados, dirección de relaciones, seed idempotente, paths de evidencia y queries acotadas.
2. **Eventos mock:** pantalla de checkout, resultado de pago ficticio, modo `bank-connector timeout` e ingestión idempotente.
3. **Agentes:** Triage Agent calcula impacto con herramienta de grafo; Investigator Agent usa el handoff para revisar deploy/owner/histórico; runbook lo selecciona el orquestador.
4. **MCP del producto:** servidor privado con tools de grafo read-only y allowlisted que usan ambos agentes; no hay consulta Cypher abierta.
5. **War Room:** incidentes, paths visuales, timeline por agente, fuentes, runbook y transición simulada.
6. **Modelo opcional:** integrar Ollama y un proveedor API cloud inicial detrás de `ModelGateway`; agregar adapters restantes sólo si hay tiempo. Fallback determinista siempre disponible.
7. **QA:** escenario feliz, timeout, cambio correlacionado, repetición de evento y caída de modelo; seed/reset y ensayo de demo.

## Reparto sugerido

- **Dev A:** grafo/schema/seed, FastAPI, agentes/handoff, `ModelGateway`, pruebas de integración.
- **Dev B:** checkout, estado de pago mock, War Room, Cytoscape, animación POS y estados responsivos.
- **Apoyo opcional de deploy:** compose, host, secrets/env, smoke check y enlace público.
- **Apoyo opcional de slides:** guion, capturas y diagrama después de validar los datos de demo.

## P1 — si P0 está estable

- Sincronizar/reutilizar la animación 3D existente después de verificar formato, licencia y control temporal.
- Desplegar demo accesible, CI y presentación grabada de respaldo.

## P2 — posterior al hackathon

Conectores reales de observabilidad, GitHub/Slack; multi-tenant; aprobaciones y auditoría avanzada; remediación real con permisos; evaluación comparativa de modelos; memoria procedimental avanzada.

## Límite de alcance MCP

El Track 01 destaca selección de herramientas mediante MCP. Por eso P0 incorpora un MCP de producto mínimo con tools nombradas y allowlisted (blast radius, deploys recientes, owners, incidentes similares y runbooks), no el servidor genérico con Cypher arbitrario. Si el tiempo se reduce, conservar al menos `calculate_blast_radius` y `get_recent_deployments` como integración visible y reportar cualquier recorte honestamente.
