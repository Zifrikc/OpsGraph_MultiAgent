> **Diseño histórico, no árbol actual del repositorio.** La estructura implementada está en [IMPLEMENTED_V3.md](IMPLEMENTED_V3.md), el modelo real en [GRAPH_DATA_MODEL.md](GRAPH_DATA_MODEL.md) y el arranque en [README.md](../../README.md). El árbol y las herramientas de abajo son propuestas anteriores; no debe inferirse que cada archivo existe.

# Arquitectura y jerarquía del proyecto

Este archivo conserva decisiones y una jerarquía propuesta para OpsGraph AI. El repositorio implementó una variante más pequeña bajo `apps/api/` y `apps/web/`, adecuada para dos desarrolladores principales.

## Decisiones

### Estado al redactar este diseño histórico

En esta fase sólo existía el prototipo frontend. Posteriormente se implementaron FastAPI, FalkorDB, MCP y la coordinación de agentes. Consulte `IMPLEMENTED_V3.md` para el estado vigente.

- **Producto:** monolito modular. Next.js presenta Checkout y War Room; FastAPI es dueño de la lógica, los eventos y los límites de acceso a FalkorDB y al proveedor de modelos.
- **Agentes de producto:** Triage Agent e Investigator Agent son dos especialistas identificables, coordinados por un orquestador; comparten el modelo y corren en secuencia.
- **Acceso al grafo:** servidor MCP propio, privado y de sólo lectura para operaciones de dominio permitidas; Triage/Investigator eligen sus herramientas MCP. Las tools usan queries parametrizadas; el LLM no envía Cypher arbitrario.
- **Proveedor de LLM:** `ModelGateway` detrás de una interfaz interna, seleccionable por configuración: Ollama, Anthropic Claude, Google Gemini u OpenAI GPT. Las API keys viven sólo en el backend.
- **Claude Code:** se usa como asistente de desarrollo. `CLAUDE.md`, skills, subagents y hooks pertenecen a la configuración del agente de programación; no son dependencias ni arquitectura runtime del producto.
- **MCP:** servidor FalkorDB opcional y privado para inspección durante desarrollo. La aplicación usa su propio repositorio de grafo/tool layer, no expone MCP a los usuarios.

## Jerarquía recomendada

```text
GrahpAgentHackathon/
├── README.md                         # entrada, setup breve y enlaces
├── CLAUDE.md                         # contexto para Claude Code
├── docs/
│   ├── product/{PRODUCT_CONTEXT,SPEC,ROADMAP}.md
│   ├── architecture/ARCHITECTURE.md
│   ├── demo/{DEMO_AND_DESIGN,ASSETS}.md
│   └── operations/{DEPLOYMENT,LOCAL_MODELS,MODEL_PROVIDERS,QA_PLAN}.md
├── .gitignore
├── .env.example                      # sólo nombres/valores de ejemplo no válidos
├── .pre-commit-config.yaml
├── Makefile
├── compose.yaml
├── pyproject.toml                    # backend y herramientas Python
├── uv.lock                           # lockfile reproducible si se adopta uv
├── .claude/
│   ├── settings.json                 # settings compartidos no sensibles
│   ├── rules/
│   │   ├── backend-python.md         # reglas con scope de rutas backend
│   │   └── frontend-typescript.md    # reglas con scope de rutas frontend
│   ├── agents/
│   │   └── architecture-reviewer.md  # agente de revisión sólo cuando sea útil
│   └── skills/
│       ├── add-model-provider/SKILL.md
│       └── graph-query-review/SKILL.md
├── .mcp.json                         # sólo configuración MCP compartible; sin secretos
├── .github/workflows/ci.yml
├── backend/
│   ├── Dockerfile
│   ├── pyproject.toml                 # puede omitirse si se usa sólo el de raíz
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── api/v1/                   # routers HTTP y validación del borde
│   │   ├── domain/                   # entidades, reglas y estados del incidente
│   │   ├── services/                 # casos de uso: intake, triage, mock payment
│   │   ├── graph/                    # repositorio, queries Cypher, seed y mappers
│   │   ├── agents/                   # orquestación, prompts y schemas de salida
│   │   ├── mcp/                      # servidor MCP de dominio y tools allowlisted
│   │   ├── llm/
│   │   │   ├── gateway.py            # interfaz/model selector
│   │   │   ├── schemas.py            # request/response neutrales al proveedor
│   │   │   └── providers/            # adapters ollama, anthropic, google, openai
│   │   └── observability/
│   └── tests/
│       ├── unit/
│       ├── integration/
│       └── fixtures/
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── package-lock.json
│   ├── public/models/                # sólo modelos con licencia verificada
│   └── src/
│       ├── app/{checkout,war-room}/
│       ├── features/{payments,incidents}/
│       ├── components/
│       ├── lib/api.ts
│       └── styles/
├── infra/
│   ├── falkordb/README.md
│   └── deploy/                       # sólo si hay scripts concretos
└── Models/                            # assets fuente; validar licencia/tamaño antes de integrar
```

El árbol anterior es una propuesta, no una lista de archivos presentes. La implementación usa `apps/api/`, `apps/web/`, `compose.yaml` y `.github/workflows/ci.yml`. No se crearon carpetas vacías, hooks ni skills de Claude Code sólo para cumplir una plantilla.

## Convenciones de Claude Code

- Mantener `CLAUDE.md` breve: objetivo, límites, estructura esencial, comandos válidos y link a documentos de detalle. Claude Code lo carga como contexto de proyecto.
- Guardar guía extensa y referencia en los `.md` existentes; reglas condicionales por ruta en `.claude/rules/`.
- Crear una skill en `.claude/skills/<nombre>/SKILL.md` sólo cuando el equipo repita un flujo (por ejemplo, añadir proveedor o revisar una query de grafo).
- Crear subagents en `.claude/agents/` sólo para trabajos que ganen con contexto aislado, como revisión de seguridad/arquitectura. No se requieren agentes autónomos de producto para demostrar multi-agent.
- Hooks de Claude Code en `.claude/settings.json` pueden ejecutar lint/format determinista después de edición. Guardar sólo comandos inocuos y explícitos; comandos destructivos, despliegue y lectura/escritura de secretos quedan fuera de hooks automáticos.
- Compartir configuración no sensible. `.claude/settings.local.json`, credenciales, memoria personal y allowlists específicas de máquina permanecen ignoradas/no versionadas. Revisar toda configuración MCP antes de aceptarla.
- No duplicar instrucciones completas entre `CLAUDE.md`, `AGENTS.md` y README. Si luego se usan varios asistentes, dejar el estándar del proyecto en docs neutros y adaptar instrucciones mínimas por herramienta.

Documentación oficial: [Claude Code overview](https://code.claude.com/docs/en/features-overview), [memory](https://code.claude.com/docs/en/memory), [skills](https://code.claude.com/docs/en/skills), [hooks](https://code.claude.com/docs/en/hooks), [subagents](https://code.claude.com/docs/en/sub-agents), [MCP](https://code.claude.com/docs/en/mcp).

## Stack

| Componente | Elección propuesta | Función |
|---|---|---|
| Frontend | Next.js + TypeScript + Tailwind | Checkout mock y OpsGraph War Room |
| Visualización | Cytoscape.js; Three.js/R3F opcional | Grafo de dependencias 2D; escena POS 3D narrativa |
| API | Python + FastAPI + Pydantic | HTTP, validación, casos de uso y orquestación |
| Grafo | FalkorDB + cliente Python oficial | Topología, incidencias, despliegues, equipos y runbooks |
| Proveedor de modelo | `ModelGateway` propio + SDK oficial por adapter | Cambiar proveedor con configuración y dependencias justificadas |
| Local | Ollama | Inferencia sin API key, p. ej. perfil de pruebas local |
| Nube | Anthropic / Google Gemini / OpenAI | Opción del usuario con credencial y cuota disponibles |
| Desarrollo | uv/pytest/Ruff; npm/eslint/tsc | Locks, calidad y ejecución repetible |
| Runtime local | Docker Compose | FalkorDB y opcional API/UI; Ollama host suele simplificar GPU |

Usar SDK oficial por adapter detrás de `ModelGateway` propio. Así no se agrega otra capa sólo para cambiar proveedor y se hacen explícitas las diferencias en salida estructurada. Comprobar compatibilidad por modelo antes de prometer paridad. Para el MVP, los modelos no ejecutan tools: el backend completa el triage y les pasa evidencia.

## Capa de proveedores

```text
API / TriageService → ModelGateway.generate_incident_summary(evidence)
                         ├─ OllamaAdapter       (perfil local)
                         ├─ AnthropicAdapter    (Claude API)
                         ├─ GoogleAdapter       (Gemini API)
                         └─ OpenAIAdapter       (GPT API)
```

Configurar `MODEL_PROVIDER=ollama|anthropic|google|openai`, `MODEL_NAME=...`, timeout y límites de salida en config. El adapter seleccionado valida sus variables de entorno; no hacer fallback silencioso a proveedor de pago. Si falta una key o falla la llamada, usar resumen determinista desde la evidencia y reportar `provider_status` a la UI. Cada proveedor debe poder probarse de forma aislada mediante `GET /api/v1/health`/endpoint de diagnóstico protegido o comando local; no enviar keys al frontend ni guardarlas en el grafo.

Para llaves de usuario: en hackathon basta configuración en `.env` del backend/secret manager del host; la UI no debe aceptar key persistente en MVP. Si después se construye BYOK multiusuario, cifrar keys en un vault/secret store, nunca en texto plano ni en localStorage, con aislamiento por tenant, permisos y eliminación.

## MCP, skills y eventos

- **MCP de producto (P0):** servidor propio con tools read-only: `calculate_blast_radius`, `get_recent_deployments`, `get_owners`, `find_similar_incidents` y `find_applicable_runbooks`. Cada handler valida schemas, límites y alcance antes de llamar al repositorio.
- **MCP genérico de FalkorDB:** opcional para inspección local y separado del flujo del producto; nunca exponer Cypher general al modelo.
- Ambos agentes invocan tools MCP según su rol; registrar tool name, argumentos normalizados, referencias y resultado. El adapter de modelo normaliza function/tool calls. Si un provider no los soporta con fiabilidad, usar fallback determinista explícito.
- Transporte `stdio` local o HTTP privado/autenticado entre orquestador y servidor; no publicar MCP a Internet ni conectar frontend directamente.
- **Skills del producto:** los runbooks operativos que el agente recomienda son contenido versionado del producto y/o nodos de grafo. No confundirlos con Claude Code skills de desarrollo bajo `.claude/skills/`.
- **Hooks de dominio:** `PaymentMocked`, `IncidentCreated`, `TriageCompleted`, `IncidentStatusChanged`, idempotentes y persistidos en timeline.
- **Hooks de Claude Code:** sólo automatizan tareas del ciclo de edición; no son hooks del backend.

## Calidad, Docker y CI

- Pre-commit: Ruff, ESLint, TypeScript y detección de secretos; pruebas rápidas según el tiempo que tarden.
- CI en GitHub Actions para pull requests: lint, unit tests, integración con FalkorDB de prueba, build backend y frontend.
- Dockerfiles multi-stage, dependencias fijadas, usuario no-root; imágenes pinneadas por versión, no `latest`.
- Compose mantiene FalkorDB en volumen nombrado con healthcheck; Ollama normalmente se ejecuta en host y nunca se embebe el modelo en la imagen.
- Makefile implementará sólo comandos comprobados: `up`, `down`, `seed`, `dev-back`, `dev-front`, `lint`, `test`, `check`. Documentar `reset` como destructivo del volumen.
- No Kubernetes/Terraform para este MVP. Añadir pipeline de deploy únicamente cuando plataforma y credenciales estén decididas.

## Organización del equipo (2 devs + apoyo opcional)

1. **Backend/modelo/grafo:** contratos de evento, seed, queries acotadas, `ModelGateway`, adapters.
2. **Frontend/demo:** Checkout, escenarios, War Room y grafo visual.
3. **Apoyo despliegue:** compose, variables/secretos, smoke test del host.
4. **Apoyo slides:** narrativa y capturas después de estabilizar el guion.

## Decisiones técnicas de seguridad

- API keys sólo server-side y separadas por proveedor. `.env` ignorado; rotar si se expone.
- Los eventos y textos externos se tratan como datos no confiables; el LLM sólo ve información necesaria.
- Queries Cypher predefinidas, parametrizadas y limitadas en profundidad/tamaño.
- Herramientas de remediación son recomendaciones/demo; acciones reales requieren autorización y auditoría.
- No guardar PAN/CVV. Todo pago es mock.
