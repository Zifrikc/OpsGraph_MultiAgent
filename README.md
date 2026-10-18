# OpsGraph AI

Primera versión integrada de un war room de incidentes: **Next.js + FastAPI + FalkorDB + MCP privado + Ollama/Gemini**. Una compra ficticia con POS 3D genera eventos; dos agentes investigan dependencias y presentan evidencia persistida.

## Arranque local

Requisitos: Git y Docker Desktop iniciado con contenedores Linux. No necesitas cuenta FalkorDB Cloud, Python ni Node para ejecutar los contenedores.

```powershell
git clone https://github.com/Zifrikc/OpsGraph_MultiAgent.git
cd OpsGraph_MultiAgent
powershell -ExecutionPolicy Bypass -File scripts/setup.ps1
docker compose up -d --build
```

Abrir **http://localhost:3000**. La API crea automáticamente los ocho servicios semilla. `setup.ps1` genera contraseñas únicas en `.env`, excluido de Git. Cada compañero genera su propia configuración; no necesita tus contraseñas.

## Modelos

El perfil inicial utiliza Ollama del equipo host con `qwen3.8:27b`. Docker accede a Ollama mediante `host.docker.internal:11434`. Si falla o tarda más que el timeout, las consultas de grafo continúan y la UI muestra fallback explícito.

Para Gemini, editar `.env` localmente:

```dotenv
MODEL_PROVIDER=google
MODEL_NAME=MODELO_HABILITADO_EN_TU_CUENTA
GOOGLE_API_KEY=TU_CLAVE_LOCAL
```

Sin inferencia: `MODEL_PROVIDER=none`. Después de cambios:

```powershell
docker compose up -d --force-recreate api
```

La V1 implementa Ollama/Gemini. Claude/GPT son extensiones previstas. Las claves permanecen en el servidor.

## Recorrido

1. Payment studio → producto → timeout o cambio reciente + timeout → pagar.
2. Abrir Observabilidad e Investigación: impacto, herramientas MCP y referencias.
3. Aprobar recuperación simulada; no vuelve a cobrar el pago fallido.
4. Exportar eventos. Recargar conserva la sesión. Reiniciar abre otra sin borrar historial.

Los pagos, servicios representados y datos operativos son ficticios. La base, las consultas, el transporte MCP y las llamadas al modelo son reales.

## Documentación principal

- [FalkorDB desde cero](docs/operations/FALKORDB_LOCAL.md): instalación, accesos locales, consultas, Ollama/Gemini y problemas frecuentes.
- [Arquitectura implementada V1](docs/architecture/IMPLEMENTED_V1.md): estructura real, contratos, agentes, MCP y límites.
- [Entrega al compañero](docs/operations/HANDOFF_V1.md): revisión, validaciones y preparación para Cloud Run.
- [SPEC](docs/product/SPEC.md), [contexto](docs/product/PRODUCT_CONTEXT.md) y [roadmap](docs/product/ROADMAP.md): objetivos y evolución.
- [Arquitectura inicial](docs/architecture/ARCHITECTURE.md) y [proveedores previstos](docs/operations/MODEL_PROVIDERS.md): diseño objetivo. IMPLEMENTED_V1 prevalece sobre capacidades futuras.
- [Prototipo frontend inicial](docs/demo/FRONTEND_PROTOTYPE.md): registro de la fase anterior.

## Desarrollo y validación

Código en `apps/web` y `apps/api`. Locks: `package-lock.json` y `uv.lock`. Para desarrollo fuera de Docker: Node.js 22, Python 3.12 y uv.

```powershell
python -m pip install uv
cd apps/api
python -m uv sync --frozen
cd ../web
npm ci
cd ../..
powershell -ExecutionPolicy Bypass -File scripts/check.ps1
```

Las pruebas crean y eliminan exclusivamente un grafo temporal `opsgraph_test_<uuid>`; no borran `opsgraph_dev`. El comando también compila Next.js. GitHub Actions contiene la validación de integración y build.

## Operación

```powershell
docker compose ps
docker compose logs --tail 40 api
docker compose stop
docker compose start
```

FalkorDB publica solo `localhost:6380`, exige contraseña y guarda instantáneas RDB en un volumen. El contenedor guarda los cambios tras 60 segundos con al menos una escritura y al cerrarse limpiamente; un cierre brusco puede perder los cambios posteriores a la última instantánea. Evita eliminar volúmenes si quieres conservar el historial.

## Límites

Una investigación activa, un worker y acceso local de demostración. No implementa A2A, ADK, autenticación empresarial, colas durables ni embeddings. Cloud Run se configurará después de la revisión: base externa persistente, Secret Manager, identidad y red. Los contenedores aceptan `PORT` y escuchan en `0.0.0.0`; aún no se ha desplegado en Google Cloud.

## Atribución 3D

This work is based on [“1 POS”](https://sketchfab.com/3d-models/1-pos-0d4121c18e4341a0839fc6f20af24b88) by [abhijithsince2002](https://sketchfab.com/abhijithsince2002), licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Licencia original preservada y crédito visible en la interfaz.
