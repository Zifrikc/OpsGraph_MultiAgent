# OpsGraph AI — instrucciones para Claude Code

## Proyecto

OpsGraph AI es un demo de respuesta a incidentes con grafo. La compra POS es ficticia; no procesar pagos reales. FastAPI controla acceso a FalkorDB y proveedores de modelos; la UI nunca recibe credenciales de proveedores ni conecta directamente al grafo.

## Referencias

- `docs/architecture/ARCHITECTURE.md`: jerarquía y decisiones técnicas.
- `docs/product/SPEC.md`: alcance, agentes del producto, seguridad y criterios de aceptación.
- `docs/operations/MODEL_PROVIDERS.md`: selección Ollama/Claude/Gemini/GPT.
- `docs/demo/DEMO_AND_DESIGN.md`, `docs/operations/QA_PLAN.md`, `docs/operations/DEPLOYMENT.md`: demo, verificación y nube.

## Reglas

- Conserva el diseño de monolito modular adecuado para dos desarrolladores; no agregues microservicios, Kubernetes o infraestructura sin una razón concreta.
- Usa consultas de grafo predefinidas, parametrizadas, con límites de hops/resultados. No permitas Cypher arbitrario del modelo.
- Los agentes del producto usan únicamente las herramientas allowlisted del MCP de dominio; no confundir ese servidor con los subagents MCP/Claude Code de desarrollo.
- Mantén la interfaz de dominio neutral respecto al proveedor. Las keys se leen sólo desde el backend; nunca las incluyas en logs, frontend, grafo o commits.
- La disponibilidad de modelo es opcional: el triage basado en grafo debe funcionar con resumen determinista si no hay modelo o API key.
- Separa hechos del grafo, correlaciones y conclusiones del modelo; cita referencias de evidencia.
- No uses datos de pago reales ni guardes PAN/CVV. No realices acciones productivas.
- No inventes comandos de build/test: lee README/pyproject/package scripts y ejecuta los que existan cuando se solicite verificar.
- Antes de añadir una dependencia o proveedor, actualiza la configuración de ejemplo y la documentación de setup, timeout, errores y prueba.

## Estructura actual

La V1 implementada usa `apps/web` (Next.js) y `apps/api` (FastAPI, FalkorDB, MCP stdio, Ollama/Gemini). Prevalece `docs/architecture/IMPLEMENTED_V1.md` sobre árboles y capacidades futuros en documentos iniciales. Arranque con `scripts/setup.ps1` y `docker compose up -d --build`. Validación: `scripts/check.ps1` (requiere uv/Node). Nunca versionar `.env`, `.local`, volúmenes ni secretos. No desplegar en Google Cloud hasta revisión del compañero.
