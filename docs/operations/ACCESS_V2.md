# Acceso local y guía de uso V2

## Arranque

En PowerShell, desde la raíz del repositorio:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/setup.ps1
docker compose up -d --build
docker compose ps
```

`setup.ps1` conserva los secretos existentes y agrega los nuevos. En este equipo la interfaz abre en `http://localhost:3100`; en una instalación nueva normalmente es `http://localhost:3000`. El valor real está en `WEB_PORT` dentro de `.env`.

## Credenciales de demo

El login ofrece `admin`, `operator` y `viewer`. Para esta demo local, **admin / admin** y el botón de la pantalla de acceso muestra esas credenciales. `operator` y `viewer` conservan contraseñas generadas en `.env`. Cambia `ADMIN_PASSWORD` por un secreto fuerte antes de exponer el sistema en internet; Cloud Run debe recibirlo mediante Secret Manager.

| Rol | Puede hacer |
| --- | --- |
| viewer | Ver topología, métricas y eventos de la sesión |
| operator | Lo anterior y crear pagos ficticios |
| admin | Lo anterior, aprobar recuperación simulada y consultar el chat |

## Demostración sugerida

1. Ingresa como admin y observa 30 tiendas, servicios compartidos y barras de métricas.
2. En Payment studio elige Tienda Norte y escenario exitoso. Paga y cierra el diálogo de éxito.
3. Abre una nueva sesión; elige Tienda Sur y timeout. Paga. El diálogo lleva a Investigación.
4. Revisa ruta afectada, agentes, runbook y estado del proveedor de IA. Aprueba recuperación simulada y observa el diálogo de confirmación y el estado resuelto.
5. Abre Asistente y pregunta por el timeout. Revisa las fuentes y `provider_status`: `ollama`/`google` indican una respuesta válida; `deterministic_fallback:*` indica que respondió la ruta fundamentada de respaldo.
6. Cierra sesión y entra como viewer para comprobar que el pago y las acciones de admin están restringidos.
7. En Payment Studio, usa **Simulate failures in 30 stores**. La simulación crea eventos por tienda y una investigación representativa; el explorador de grafos permite arrastrar nodos y fondo, y ampliar con la rueda. La recuperación valida primero RB-007 mediante MCP y registra el paso del agente.

El modelo local `qwen3.8:27b` puede tardar más de 45 segundos en este equipo; el grafo y la demo continúan con fallback explícito. El Agent Console permite seleccionar Ollama, Gemini, Claude u OpenAI e ingresar una clave temporal por sesión. Si se prefiere configuración del servidor, define `MODEL_PROVIDER=google`, `MODEL_NAME` y `GOOGLE_API_KEY` en `.env` y recrea la API. Las APIs externas aún requieren validación con claves reales autorizadas por cada proveedor.

## Estado de entrega

Esta ampliación está en el árbol de trabajo local y pendiente de revisión. No subirla a GitHub hasta que el usuario la valide. Para nube faltan proveedor de identidad, cuotas, secretos gestionados, base externa y aislamiento de datos.
