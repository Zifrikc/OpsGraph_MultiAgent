# Contexto de producto, flujos y funcionalidades

## Problema

Durante una degradación de producción, un equipo pierde tiempo uniendo alertas, mapa de arquitectura, deploys, propiedad de servicios y runbooks almacenados en sistemas distintos. OpsGraph AI pone estas conexiones en un grafo compartido para que el triage describa no sólo “qué servicio falló”, sino “qué depende de él, qué cambió y qué hacer después”.

El MVP es una simulación visual del caso de pagos. La pasarela y los datos son inventados; no son una integración financiera. La compra dispara una transacción simulada, que puede emitir una señal normal o de fallo para alimentar la investigación del grafo.

## Encaje con tracks

- **Track 01 — Agents That Act on Connected Data (principal):** multi-hop en dependencias, selección de herramientas/queries, cálculo de blast radius y creación/actualización del incidente con pasos auditables.
- **Track 03 — Company Brain (secundario):** conecta servicio, equipo, persona, despliegue, incidente y runbook con referencias.
- **Track 02 — Memory/Coordination (complementario):** el estado compartido persiste en FalkorDB; el orquestador registra handoff explícito entre los agentes de triaje e investigación. Mantenerlo acotado al incidente y la demo, sin construir una plataforma multi-tenant.

## Funcionalidades y pantallas

### Checkout Lab

- Carrito ficticio con artículos/precios sintéticos.
- Botón pagar y transición visual: tarjeta acercándose → procesando → resultado mock.
- Selector de escenario: normal, alta latencia del procesador, tasa de error elevada. Un CTA “Simular incidente” disponible sin depender del 3D.
- Panel de señal sintética: servicio, métrica y umbral; botón para abrir War Room.

### OpsGraph War Room

- Encabezado con estado, severidad y tiempo del incidente.
- Grafo de topología: causa probable en rojo, servicios afectados en ámbar, sanos en azul/gris; controles de zoom y selección.
- Panel de explicación con paths concretos y enlaces de evidencia.
- Timeline: evento recibido → triage → traversal → deploy/owner encontrado → runbook recomendado.
- Runbook con pasos numerados y botón simulado “Marcar mitigado”; ninguna ejecución real.
- Lista de incidentes previos y filtro por estado.

## Dataset demostrativo sugerido

Topología simulada de ocho servicios, sin desplegar ocho procesos: `api-gateway` → `order-service` → `payment-service` → `bank-connector`; `payment-service` también se relaciona con `authentication-service`, `fraud-detection-service` y `transaction-database`; `notification-service` recibe órdenes/eventos de `order-service`. Definir y documentar las aristas con dirección consumidor → dependencia, y usar `EMITS_TO` para flujo asíncrono si no es dependencia de disponibilidad. Equipos: Commerce, Payments y Platform; personas/deploys ficticios.

Escenario B principal: `bank-connector` agota timeout sintético al responder a `payment-service`. La API recibe `payment.bank_connector.timeout`; el traversal inverso explica el impacto hacia `payment-service`, `order-service` y `api-gateway`. `notification-service` sólo se marca afectado si el grafo y el escenario muestran una relación transitiva válida. Un deploy ficticio `dep-pay-104` se desplegó 12 min antes; owner Payments; runbook “Timeout del conector bancario” con verificación de circuit breaker y fallback controlado, recomendado solamente y nunca ejecutado.

Escenario C opcional: cargar en el grafo un deploy/commit ficticio que cambia el timeout de `bank-connector`. El Investigator lo presenta como cambio cercano a la falla, no como causa confirmada.

Métricas deben presentarse como datos simulados, no benchmarks. Dejar explícito si el deploy correlacionado precede a la falla sin asegurar causalidad.

## Historia de usuario principal

Como ingeniera de guardia, al recibir una alerta de degradación de pagos, quiero ver en minutos la ruta del impacto, los equipos responsables, el cambio reciente y el runbook aplicable para decidir una mitigación con evidencia.

## Coordinación entre agentes

El backend asigna un `incident_id` y guarda `agent_name`, `status`, `started_at`, `completed_at`, `input_refs`, `output_refs`, `model_provider`, `model_name` y `error_code`. El **Triage Agent** entrega al **Investigator Agent** un handoff persistido con el servicio raíz, rutas e incidentes. El Investigator añade deploys, owners e incidentes históricos. El orquestador recupera el runbook aplicable y solicita síntesis final. Si el modelo falla, ambos resultados estructurales siguen disponibles y la UI muestra resumen determinista.

## Principios de producto

1. Cada conclusión de impacto tiene relación/path visible.
2. Distinguir hechos de grafo, correlaciones temporales e hipótesis de modelo.
3. Mantener la topología navegable aun sin modelo ni WebGL.
4. El agente recomienda; el humano confirma cualquier acción.
5. Mantener la narrativa operable por dos desarrolladores: una demo preparada vale más que un sistema de agentes complejo que falle en vivo.
