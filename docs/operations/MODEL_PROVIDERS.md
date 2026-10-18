> Documento de diseño/fase anterior. Para el estado ejecutable actual, consultar [Arquitectura V1](../architecture/IMPLEMENTED_V1.md) y [guía local](../operations/FALKORDB_LOCAL.md).

# Proveedores de modelos: local y cloud opcional

## Objetivo

Un participante puede correr el demo con Ollama sin costo por llamada, o usar una API key que ya tenga para Anthropic Claude, Google Gemini u OpenAI GPT. El frontend y la lógica de incidente son los mismos en todos los casos. El backend selecciona un único proveedor por entorno; no se requiere que todos instalen Ollama.

## Recomendación de diseño

Implementar un `ModelGateway` interno con un método estrecho:

```python
async def summarize_incident(evidence: IncidentEvidence) -> IncidentSummary:
    ...
```

`IncidentEvidence` es una estructura del producto con incidente, paths del grafo, deploys, owners y runbook. `IncidentSummary` valida JSON tipado (`summary`, `likely_causes`, `evidence_refs`, `recommended_steps`, `uncertainties`). Crear adapters para `ollama`, `anthropic`, `google`, `openai`; configuración selecciona uno. Las operaciones de triage y Cypher se ejecutan antes de esta llamada con código Python determinista.

Para mantener pequeño el stack, el MVP debe usar los SDK oficiales dentro de adapters delgados detrás de `ModelGateway`; el proyecto ya usa Pydantic para validar sus propios esquemas. Evaluar una librería multi-provider como PydanticAI sólo si reduce de verdad el código duplicado, sin ocultar diferencias de proveedor ni aumentar el riesgo de integración. No exigir compatibilidad completa: probar el resumen estructurado que necesita el producto y usar fallbacks.

## Configuración del backend

```dotenv
# modo local por defecto (sin API key)
MODEL_PROVIDER=ollama
MODEL_NAME=qwen3:4b
OLLAMA_BASE_URL=http://localhost:11434
MODEL_TIMEOUT_SECONDS=45
MODEL_MAX_OUTPUT_TOKENS=700

# sólo definir para el proveedor elegido; no incluir valores reales en git
# ANTHROPIC_API_KEY=
# GOOGLE_API_KEY=
# OPENAI_API_KEY=
```

Perfil Claude API:

```dotenv
MODEL_PROVIDER=anthropic
MODEL_NAME=claude-sonnet-5
ANTHROPIC_API_KEY=<tu_clave_en_el_entorno_local>
```

Perfil Gemini API:

```dotenv
MODEL_PROVIDER=google
MODEL_NAME=<id_de_modelo_activo_en_Gemini_API>
GOOGLE_API_KEY=<tu_clave_en_el_entorno_local>
```

Perfil GPT API:

```dotenv
MODEL_PROVIDER=openai
MODEL_NAME=<id_de_modelo_activo_en_OpenAI_API>
OPENAI_API_KEY=<tu_clave_en_el_entorno_local>
```

Los IDs de arriba son ejemplos/configurables, no valores a hardcodear. `MODEL_NAME` debe apuntar a un modelo activo habilitado para la cuenta. Revisar endpoints y precios actuales antes de uso.

## Flujo al cambiar proveedor

1. Cambiar `MODEL_PROVIDER` y `MODEL_NAME` en el entorno del **backend**.
2. Proveer sólo la key correspondiente mediante entorno/secret manager.
3. Reiniciar backend y comprobar salud del adapter; fallar con error claro si provider/model/key no coinciden.
4. Ejecutar el caso de triage fixture; validar JSON y cada `evidence_ref`.
5. Confirmar fallback local determinista deshabilitando temporalmente el provider.

El browser no puede elegir una key ni mandarla al endpoint. Para un demo grupal cada persona configura su propio backend o un operador prepara el host de demo. No registrar key ni solicitud/respuesta cruda en logs. Añadir límites, timeout y control de consumo al perfil cloud.

## Matriz de capacidades que debe probarse

| Capacidad necesaria | Ollama | Claude | Gemini | GPT |
|---|---|---|---|---|
| Resumen basado en evidencia | Sí, verificar modelo local | Sí, API | Sí, API | Sí, API |
| Respuesta estructurada validable | Prompt JSON + validación/fallback | Salida estructurada si el modelo/API lo permite; validar | JSON mode/schema según API/modelo; validar | Structured Outputs según API/modelo; validar |
| Tools del LLM | No necesarias para MVP | No necesarias para MVP | No necesarias para MVP | No necesarias para MVP |
| Sin API key | Sí | No | No | No |
| Requiere Internet | No, una vez descargado | Sí | Sí | Sí |

Implementación MVP: no pasar herramientas de base de datos directamente al modelo. El backend publica sólo tools de dominio allowlisted para los agentes (`calculate_blast_radius`, `get_recent_deployments`, `get_owners`, `find_similar_incidents`). El provider adapter normaliza las solicitudes de tool calling; si el modelo/configuración no las soporta de forma confiable, el orquestador usa un plan de herramientas determinista y registra ese modo. En ambos casos el modelo nunca puede enviar Cypher.

## Manejo de fallos

- Missing key, cuota agotada, timeout, 429, 5xx, JSON inválido: registro estructurado sin secretos, estado `provider_status=unavailable|invalid_output`, y resumen determinista.
- No hacer failover automático a una API de pago; cambiar proveedor sólo por configuración explícita.
- UI informa si la síntesis vino de `ollama`, `anthropic`, `google`, `openai` o `fallback`, sin exponer detalles internos de key.
- Si el usuario solicita costo, mostrar modelo/provider y tokens/tiempo si el SDK los ofrece; no presumir precio exacto en UI sin datos del proveedor.

## Fuentes oficiales consultadas (2026-10-16)

- Anthropic, [Claude model lifecycle](https://docs.anthropic.com/en/docs/about-claude/model-deprecations): los model IDs tienen ciclo de vida; seguir activos y reemplazos indicados.
- Google, [Gemini API models](https://ai.google.dev/gemini-api/docs/models): seleccionar modelos activos y revisar disponibilidad/estado.
- Google, [GenAI SDKs](https://ai.google.dev/gemini-api/docs/libraries): recomienda Google GenAI SDK para integraciones directas.
- Google, [OpenAI compatibility](https://ai.google.dev/gemini-api/docs/openai): permite migración rápida usando SDK OpenAI/base URL, con límites respecto a funciones nativas; para este proyecto preferir adapter oficial de Gemini salvo razón de compatibilidad.
- Google, [API overview](https://ai.google.dev/api): Interactions es la interfaz recomendada actual para workflows agentic; el MVP sólo necesita síntesis estructurada.
- OpenAI, [Models](https://platform.openai.com/docs/models): escoger IDs/modelos activos según capacidades.
- Ollama, [Qwen 3 library](https://ollama.com/library/qwen3/tags): tags y tamaños publicados del modelo alternativo.
