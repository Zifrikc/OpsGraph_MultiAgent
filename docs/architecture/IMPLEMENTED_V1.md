# Arquitectura implementada — V1 local

Este documento prevalece sobre los árboles y capacidades futuros de los documentos iniciales. Fecha de referencia: 17 de octubre de 2026 (America/Lima).

## Organización

```text
apps/web/                         Next.js + React + Three.js + grafo SVG
  app/api/backend/[...path]/      Proxy servidor con rutas permitidas
  lib/useOpsGraph.ts              Estado persistido y polling
apps/api/
  app/core/config.py             Variables validadas; secretos tipados
  app/domain/models.py           Contratos de pagos, acciones y modelos
  app/application/workflow.py    Orquestación Triage → Investigator
  app/infrastructure/graph.py    Repositorio FalkorDB y semilla
  app/infrastructure/models.py   SDKs Ollama/Gemini + fallback
  app/presentation/mcp/server.py Tools de dominio de solo lectura
  app/main.py                    FastAPI, autenticación y endpoints
  tests/                        Integración con grafo aislado
  pyproject.toml, uv.lock        Dependencias reproducibles
compose.yaml                    DB persistente, API y web
scripts/setup.ps1               Configuración local sin claves compartidas
scripts/check.ps1               Integración + build
.github/workflows/ci.yml         Validación en GitHub
```

## Flujo

Browser → proxy Next.js (token servidor) → FastAPI → FalkorDB.
Orquestador → cliente MCP stdio → proceso MCP privado → consultas FalkorDB de solo lectura.
Orquestador → SDK del proveedor → plan de herramientas validado → MCP → síntesis con referencias.

Los dos agentes son roles secuenciales del mismo backend. No existe protocolo A2A ni dependencia de ADK en esta V1. Cloud Run no requiere ADK. Los cinco tools existen en un servidor MCP real y se invocan mediante ClientSession del SDK MCP; no son llamadas HTTP con un nombre decorativo.

## Decisiones reales

- Ocho servicios son entidades ficticias, no ocho procesos desplegados.
- Datos semilla operativos ficticios; DB, consultas, persistencia, protocolo MCP y llamadas al modelo son reales.
- Triage selecciona herramientas de impacto/propietarios. Investigator recibe resultados de Triage desde AgentStep persistidos y selecciona despliegues, historial y runbooks. El plan del modelo es una selección JSON tipada; el servidor ejecuta las tools por MCP. No se utiliza function calling nativo específico de un proveedor.
- Impacto y runbook tienen herramientas mínimas obligatorias. Los planes inválidos o proveedores no disponibles usan selección determinista explícita.
- Síntesis: se validan esquema y pertenencia de `evidence_refs`. Esto no garantiza automáticamente la veracidad de cada frase del modelo: la evidencia y la incertidumbre quedan visibles para revisión.
- `MODEL_PROVIDER=none|ollama|google`. Claude/GPT siguen siendo extensiones previstas; no se anuncian como adaptadores implementados.
- No hay embeddings/chunking: runbook e historial pequeños se recuperan por relaciones. No se necesita una API de embeddings para este alcance.
- Pago recibe producto/escenario; el servidor determina el importe. No recibe tarjetas ni Cypher.
- UUID del pago es clave de idempotencia; reutilizarla con otro payload devuelve 409. La sesión es un identificador de demo, no identidad autenticada de usuario.
- Solo un worker y una investigación activa por instancia; solicitudes concurrentes reciben 429. No prometer alta concurrencia ni aislamiento multiusuario empresarial.
- La investigación se ejecuta dentro de la petición; no hay tareas en memoria iniciadas después de responder. Para escalado real hacen falta trabajos durables y coordinación distribuida.
- Repositorio síncrono para consultas pequeñas y acotadas. El MCP se inicia por investigación; el coste es aceptable para esta demo.
- “Reiniciar” cambia sesión; no elimina el grafo. El historial se conserva. La consulta de eventos devuelve los 500 más recientes por sesión.
- Las recuperaciones son simuladas y explícitas; no se conecta a infraestructura bancaria ni reinicia servicios externos.

## Contratos implementados

| Método | Ruta | Uso |
|---|---|---|
| GET | `/health/live` | Proceso activo |
| GET | `/health/ready` | DB disponible y proveedor configurado (sin probar inferencia) |
| GET | `/api/v1/topology` | Servicios y relaciones de FalkorDB |
| GET | `/api/v1/state/{session_id}` | Pago actual, incidente, evidencia y eventos |
| POST | `/api/v1/mock-payments` | UUID id/session_id, product 0–2 y scenario |
| POST | `/api/v1/incidents/{id}/actions` | session_id y action=simulate_recovery |

Salvo liveness y documentación OpenAPI, se requiere `X-Opsgraph-Token`. El proxy limita rutas y tamaños y conserva el token en el servidor. La UI actualiza cada dos segundos. El frontend público es un acceso de demostración compartido; antes de nube debe añadirse/controlarse acceso de equipo y presupuesto/cuotas. El token servidor no equivale a login de usuarios finales.

## Antes de Google Cloud

Revisar con el compañero: acceso de equipo, conectividad/TLS a FalkorDB, Secret Manager, permisos de la identidad del backend, cuota/modelo Gemini, timeouts, una instancia máxima durante la demo y logging. Las imágenes aceptan `PORT` y escuchan en `0.0.0.0`. No se ha desplegado a Google Cloud en esta entrega.

La autenticación entre Next.js y FastAPI usa token de aplicación en esta versión. Si FastAPI queda protegido también por IAM de Cloud Run, el proxy necesitará un ID token de la identidad de servicio: eso no está implementado todavía. No presentar la imagen local como despliegue cloud completamente configurado.
