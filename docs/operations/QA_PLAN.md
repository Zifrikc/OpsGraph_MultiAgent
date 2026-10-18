# Plan de QA y pruebas

## Propósito

Validar el camino crítico de triage, la corrección de las rutas del grafo y la continuidad cuando el modelo, 3D o red fallan. La prioridad es un demo reproducible. Las cifras de latencia son objetivos internos y se deben medir con hardware real.

## Capas

1. **Unitarias:** validadores de eventos, idempotencia, transición de estado, mapeo de severidad, sanitización y respuesta de cada tool.
2. **Integración de grafo:** esquema + seed + consultas; rutas de dependencias con dirección; límites de profundidad; resultados duplicados; constraints reales de la versión fijada.
3. **Contrato API:** payload válido/inválido, status codes, filtros, límites, CORS y respuesta de salud.
4. **E2E:** flujo Checkout → mock payment/event → incidente → grafo → runbook → transición de estado.
5. **Exploratorio visual:** escalado móvil/desktop, WebGL apagado, teclado/lector, error de API y espera del modelo.
6. **Demo rehearsal:** restauración desde seed y repetición cronometrada en laptop de presentación.

## Matriz de escenarios

| ID | Entrada | Comprobación esperada |
|---|---|---|
| Q1 | Pago normal | Animación/confirmación; no se abre incidente crítico |
| Q2 | Timeout sintético de `bank-connector` | Un incidente nuevo; timeout visible; paths hacia `payment-service`, `order-service`, `api-gateway` |
| Q3 | Mismo `event_id` repetido | No duplica evento/incidente; se registra repetición o se devuelve existente |
| Q4 | Servicio desconocido | Validación clara; no traversal vacío presentado como éxito |
| Q5 | Sin deploy reciente | La respuesta dice “sin deploy correlacionado”, sin inventar uno |
| Q6 | Sin runbook aplicable | Mostrar ausencia y datos insuficientes; no inventar pasos con tono de certeza |
| Q7 | Modelo local desconectado o API cloud sin key/time-out | Triage de grafo se completa; fallback determinista; UI sin bloqueo; no hay failover de pago implícito |
| Q8 | Traversal grande/ciclo | Máximo de hops/nodos y deduplicación; tiempo acotado |
| Q9 | Prompt injection en resumen de alerta | Texto se trata como dato; no cambia instrucciones/herramientas disponibles |
| Q10 | WebGL no disponible/modelo roto | Fallback 2D/estático usable |
| Q11 | Payload con datos tipo PAN/CVV | Rechazo o descarte; nunca aparece en logs ni LLM |
| Q12 | Dos requests simultáneos del mismo evento | Un incidente consistente; sin doble escritura dañina |
| Q13 | Dos agentes corren sobre un incidente | Timeline distingue Triage e Investigator; el segundo recibe handoff con referencias persistidas; no inventa evidencia |
| Q14 | Modelo pide tool no allowlisted o intenta consulta libre | MCP/backend la rechaza; no se ejecuta Cypher arbitrario; la investigación continúa con respuesta de error controlada |
| Q15 | Respuesta estructurada inválida de cualquier proveedor | Validación falla de forma segura; se muestra fallback determinista; no se omiten referencias de evidencia |

## Datos QA

Sólo datos sintéticos. IDs prefijados `demo-`; personas ficticias; horarios fijados/reproducibles al seed; valores de pago no persistidos. Incluir un caso sin deploy y otro sin runbook para evitar demos que dependan de una respuesta prefabricada.

## Criterios de salida para hackathon

- Q1–Q8, Q10 y Q13–Q15 completados manual o automatizadamente.
- Seed y reset reproducibles desde una instalación limpia.
- Demo repetida dos veces sin residuos de estado anterior.
- 2–3 minutos de flujo con el modelo local, un proveedor API configurado y fallback; registrar tiempos reales, proveedor/modelo y tamaño de contexto.
- Capturas o video de respaldo listos.
- README menciona requisitos, limitaciones, setup y cómo resetear.

## Lista de observabilidad

- Correlacionar logs con `request_id` e `incident_id`.
- Medir tiempo de ingestión, consultas del grafo, inferencia LLM y render UI por separado.
- Registrar número de nodos/aristas y profundidad devueltos; no almacenar prompt/alerta cruda si incluye contenido externo sensible.
- En la demo, mostrar `model_name`, modo (`local`/`fallback`) y estado de fuentes de manera discreta.
