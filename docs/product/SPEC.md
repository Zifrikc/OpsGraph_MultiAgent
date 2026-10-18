# OpsGraph AI — Especificación funcional y técnica

**Versión:** 0.1 · **Fecha:** 2026-10-16 · **Tipo:** propuesta para hackathon

## 1. Resumen

OpsGraph AI investiga incidentes de una arquitectura ficticia mediante un grafo de dependencias y evidencia operativa. Convierte alertas en incidentes; calcula impacto hacia dependientes; enlaza servicios con despliegues, personas responsables y runbooks; y presenta una explicación reproducible con referencias a los nodos y relaciones consultados.

La demo narrativa representa una compra con POS y un teléfono de confirmación, basada en la imagen adjunta. La operación se simula en el navegador. El escenario principal genera un timeout del `bank-connector` que alimenta el flujo de investigación.

## 2. Objetivos y no objetivos

### Objetivos MVP

1. Mostrar cómo un grafo aporta razonamiento multi-hop y radio de impacto.
2. Mostrar conexiones entre servicios, equipos, cambios recientes e incidentes históricos.
3. Persistir el estado del incidente en FalkorDB y actualizar la interfaz en tiempo casi real.
4. Permitir LLM local o proveedor API cloud configurado para resumir evidencia, sin permitirle inventar relaciones ni ejecutar consultas sin control.
5. Completar una demo reproducible en menos de 3 minutos y operable por dos desarrolladores.

### Fuera de alcance

- Procesar, almacenar o transmitir dinero real, PAN/CVV/PII o credenciales de pago.
- Ejecutar remediaciones productivas, despliegues, reinicios o cambios de infraestructura.
- Afirmar reducción de tiempo/porcentaje de precisión sin una evaluación comparativa propia.
- Construir una plataforma genérica de múltiples tenants, alta disponibilidad o cumplimiento regulatorio.
- Implementar un tercer agente autónomo de remediación o automatizar cambios productivos.

## 3. Usuarios y problemas

- **On-call / SRE:** necesita saber qué está roto, qué depende de ello y qué cambió.
- **Líder de operaciones:** necesita una recomendación comprensible y el origen de cada dato.
- **Jurado/desarrollador:** necesita observar una señal de entrada, consultas al grafo, estado compartido y resultado accionable.

## 4. Alcance funcional

### P0 — imprescindible

- Vista **Checkout**: catálogo ficticio, carrito, pago mock, feedback visual y selector de escenarios.
- Vista **War Room**: lista de incidentes, severidad/estado, grafo de impacto, timeline de evidencia y tarjeta de runbook.
- Endpoint para recibir la señal mock/webhook con `event_id`, `source`, `service_id`, `kind`, `observed_at`, `metrics` y `scenario_id`.
- Idempotencia por `event_id`; eventos repetidos no duplican incidentes.
- Triage con consultas Cypher estáticas y parámetros, límites de profundidad/tamaño y resultados estructurados.
- Dos agentes especializados P0 (Triage e Investigator) con decisiones de herramienta controladas y handoff persistido; pueden compartir el mismo modelo y ejecutarse secuencialmente.
- Evidencia visible: nodos/rutas que justifican el impacto, commit/deploy si existe, equipo dueño, runbook e historial enlazado.
- Persistencia del incidente y timeline de pasos; estados `open`, `investigating`, `mitigated`, `resolved`.
- Respuesta final con resumen, evidencia, confianza cualitativa y advertencias por datos faltantes.
- Datos semilla reproducibles con exactamente ocho servicios simulados, sin desplegar ocho procesos independientes.

### P1 — si el flujo P0 está estable

- Consultar a los agentes en lenguaje natural sobre el incidente actual.
- Reproducir el timeline con pausas y estados de agente.
- Comparar dos escenarios, mostrar incidentes similares.
- Autenticación básica de demostración y rate limit para endpoint webhook.

### P2 — posterior

Conectores reales de GitHub/Prometheus/Slack, tenants, auditoría avanzada, alertas, aprobación y ejecución de remediación. No deben distraer del caso de uso central durante el hackathon.

## 5. Flujo principal

1. El usuario agrega productos ficticios y pulsa **Pagar**.
2. La UI reproduce una animación breve de tarjeta/POS y muestra resultado de pago mock. En escenario normal, se genera un evento normal de transacción.
3. Si se selecciona **Bank Connector timeout**, la app emite además `payment.bank_connector.timeout` con valores sintéticos.
4. FastAPI valida esquema, escenario permitido, idempotencia y persistencia del evento.
5. Orquestador registra el incidente y llama al **Triage Agent**, que elige herramientas permitidas para identificar el servicio y calcular dependientes; persiste paths/evidencias y un handoff en FalkorDB.
6. El **Investigator Agent** recibe ese handoff, elige entre herramientas permitidas para buscar deploys, owners e incidentes históricos; el orquestador recupera el runbook aplicable.
7. El proveedor de modelo seleccionado (Ollama o API cloud) sintetiza sólo evidencia obtenida y produce respuesta estructurada validada. Si no hay modelo, key o respuesta válida, hay resumen determinista.
8. La UI presenta el grafo resaltado, timeline y fuentes. El operador marca como mitigado/resuelto; esto sólo cambia estado de demo.

## 6. Requisitos no funcionales del prototipo

- Respuesta de API de triage: objetivo de demo p95 < 5 s sin generación LLM y < 20 s con modelo local; medir, no garantizar.
- La UI debe seguir utilizable mientras el modelo carga o no responde.
- Semilla idempotente y reset explícito de entorno local.
- Logs estructurados por `request_id` e `incident_id`; no registrar secretos ni valores de tarjeta.
- Datos de pago sólo tokens/últimos 4 sintéticos (`**** 4242`) si la UI los muestra; preferiblemente no guardar ni siquiera esto en backend.
- Consultas Cypher sólo de lectura para triage. Mutaciones se hacen desde funciones de dominio parametrizadas.
- Profundidad máxima de traversal configurada y resultados con tope de nodos/relaciones para evitar explosión.
- Aplicación accesible con teclado, contraste legible y fallback 2D si no hay WebGL.

## 7. Arquitectura y límites de confianza

```text
Browser (Checkout + War Room)
  ├─ POST /api/v1/mock-payments → Payment Simulator → domain event
  └─ GET/SSE /api/v1/incidents → incident state / timeline
                                      ↓
                          FastAPI + Orchestrator
                      ┌───────────────┼──────────────┐
                 Graph repo       ModelGateway       Event store
                      ↓          /    |   |   \           ↓
                  FalkorDB    Ollama Claude Gemini GPT  FalkorDB
```

Frontend no accede a FalkorDB ni a Ollama. El backend contiene un servidor MCP propio, privado y de sólo lectura con tools de dominio allowlisted para cada agente. Los handlers ejecutan queries parametrizadas; no existe tool de Cypher libre. El runner valida rol, argumentos, límites y salidas. El MCP genérico de FalkorDB queda separado y opcional para inspección local; no se publica a usuarios ni a Internet.

## 8. Modelo de datos propuesto

### Nodos

| Label | Propiedades mínimas |
|---|---|
| `Service` | `id`, `name`, `tier`, `team_id`, `status`, `description` |
| `Incident` | `id`, `event_id`, `severity`, `summary`, `status`, `created_at`, `scenario_id` |
| `Event` | `id`, `kind`, `source`, `observed_at`, `metrics_json` |
| `Deployment` | `id`, `commit_sha`, `message`, `deployed_at`, `environment` |
| `Person` | `id`, `display_name`, `handle` (ficticio) |
| `Team` | `id`, `name`, `slack_channel` (ficticio) |
| `Runbook` | `id`, `title`, `steps_json`, `updated_at`, `success_count`, `sample_count` |
| `HistoricalIncident` | `id`, `summary`, `resolution`, `resolved_at` |

### Relaciones dirigidas

- `(Service)-[:DEPENDS_ON]->(Service)`: dirección consumidor → dependencia; para radio hacia arriba se recorre inversamente.
- `(Incident)-[:AFFECTS]->(Service)`; `(Incident)-[:TRIGGERED_BY]->(Event)`.
- `(Deployment)-[:DEPLOYED_TO]->(Service)`; `(Person)-[:AUTHORED]->(Deployment)`.
- `(Person)-[:MEMBER_OF]->(Team)`; `(Team)-[:OWNS]->(Service)`.
- `(Runbook)-[:APPLIES_TO]->(Service)`; `(HistoricalIncident)-[:RESOLVED_BY]->(Runbook)`.

Todos los ID son estables e idempotentes. Definir constraints sólo con sintaxis soportada por la versión de FalkorDB fijada y verificar con integración local; no copiar a ciegas sintaxis de Neo4j.

## 9. Herramientas del agente

### Agentes de producto requeridos en P0

El producto demuestra **dos agentes especializados y coordinados**, aunque pueden compartir el mismo modelo configurado y ejecutarse secuencialmente para respetar la memoria disponible:

1. **Triage Agent:** recibe el evento; identifica el servicio afectado; calcula blast radius multi-hop con herramientas de grafo; persiste hipótesis inicial y paths de evidencia.
2. **Investigator Agent:** consume el handoff persistido del Triage Agent; busca deploys/commits cercanos, equipo/personas dueñas e incidentes históricos; devuelve correlaciones y datos faltantes.
3. **Remediation:** en P0 es recuperación de runbook por el orquestador. No se requiere un tercer agente independiente. El operador confirma una mitigación sólo en modo simulado.

Ambos agentes aparecen como unidades identificables en el timeline con entrada, salida, herramienta y resultado. No basta con renombrar dos pasos deterministas como “agentes”: cada especialista elige una herramienta/consulta según el contexto, dentro de una allowlist de funciones del backend.

El `Master Orchestrator` coordina estado/handoff, pero no es un tercer especialista requerido. Persistir `incident_id`, `agent_name`, estado, tiempos, referencias de evidencia, proveedor/modelo y error en FalkorDB. Para no saturar 32 GB RAM, ejecutar el mismo modelo local en secuencia; no cargar un modelo por agente.

Las funciones se definen en Python, con schemas Pydantic, y se invocan desde el orquestador:

- `get_service(service_id)` — una entidad con datos permitidos.
- `calculate_blast_radius(service_id, direction, max_hops)` — rutas/nodos dependientes acotados.
- `get_recent_deployments(service_id, since_hours, limit)` — despliegues vinculados.
- `get_owners(service_id)` — equipo/personas ficticias vinculadas.
- `find_applicable_runbooks(service_id, incident_kind)` — ordenado por evidencia y aplicabilidad.
- `find_similar_incidents(service_id, signature, limit)` — coincidencia simple de servicio/tipo; semántica sólo si se añade explícitamente.
- `update_incident_status(incident_id, status)` — transición permitida validada en dominio.

El modelo recibe resultados JSON y genera `summary`, `likely_causes`, `evidence_refs`, `recommended_steps`, `uncertainties`. El backend comprueba que cada `evidence_ref` exista. El texto no ejecuta acciones.

## 10. Contratos HTTP sugeridos

- `POST /api/v1/mock-payments`: `cart`, `scenario_id`; retorna `payment_id`, `status`, `event_ids` (sintéticos).
- `POST /api/v1/events`: acepta evento validado; requiere autenticación simple de demo si está expuesto.
- `POST /api/v1/incidents/triage`: `event_id`; retorna incidente y resumen inicial.
- `GET /api/v1/incidents?status=open`: listado.
- `GET /api/v1/incidents/{id}`: incidente, evidencia y timeline.
- `GET /api/v1/graph/topology?incident_id=...`: nodos y aristas limitados para visualización.
- `PATCH /api/v1/incidents/{id}/status`: transición de demo.
- `GET /api/v1/health`: salud de API, grafo y estado de modelo (sin exponer secretos).
- SSE opcional `GET /api/v1/incidents/{id}/events` para timeline; polling es suficiente para MVP.

## 11. Seguridad, privacidad y datos ficticios

- Las tarjetas son ilustrativas. No pedir nombre real, PAN, CVV o vencimiento auténtico; rellenar datos de demo localmente y no enviarlos al modelo.
- Rechazar campos inesperados en payloads; limitar tamaños; sanear mensajes de alertas como contenido no confiable.
- Secretos en variables de entorno; `.env` excluido de git; `.env.example` sin valores válidos.
- Límite de tasa/allowlist de `scenario_id`; CORS restringido; HTTPS en despliegue.
- Backend solo conecta a red privada del grafo/modelo. Ningún puerto de administración público.
- Tool output se considera dato, no instrucción; evitar prompt injection desde mensajes/eventos.

## 12. Criterios de aceptación

1. `make up`, `make seed`, `make dev` levanta servicios locales siguiendo documentación.
2. Un pago normal muestra animación y confirmación sin crear incidente crítico.
3. El modo degradado crea un único incidente aunque el webhook se repita.
4. El incidente presenta al menos un servicio afectado, dos dependientes/rutas multi-hop, un deploy reciente ficticio, owner y runbook.
5. Cada conclusión de impacto enlaza a una ruta/nodos visibles; si falta evidencia, la UI lo dice.
6. El fallo de Ollama no bloquea ni rompe el triage estructural.
7. Los dos agentes usan tools del MCP de producto con permisos/read-only limitados; no hay Cypher libre ni endpoint MCP público.
8. No se emiten ni guardan datos reales de pago.

## 13. Riesgos y decisiones pendientes

- **Tamaño de modelo:** arrancar con 9B/12B Q4 y medir; modelo 27B de 17 GB con 32 GB puede presionar memoria/contexto.
- **FalkorDB:** verificar licencia, imagen/tag, persistencia y sintaxis antes de fijar versión de Docker.
- **Despliegue:** una plataforma free pequeña no aloja cómodamente el grafo + LLM; mantener inferencia local o usar UI/API en nube conectada por túnel temporal seguro.
- **Assets:** inspeccionar formatos y licencias del directorio local antes de empaquetar/redistribuir.
- **Demostración:** preparar video o datos semilla de respaldo si la generación local tarda.
