# Entrega V1 para revisión del compañero

## Objetivo

Reproducir localmente OpsGraph con FalkorDB real, revisar contratos/evidencia y probar su proveedor Gemini antes de preparar Google Cloud. No se ha realizado despliegue cloud ni se necesitan credenciales de la cuenta personal del autor.

## Entrada recomendada

1. Clonar el repositorio y leer [README](../../README.md).
2. Ejecutar `scripts/setup.ps1`: crea sus propios secretos en `.env`.
3. Elegir `MODEL_PROVIDER=none` para comprobar primero API/grafo/MCP o configurar Gemini según [la guía](FALKORDB_LOCAL.md).
4. `docker compose up -d --build` y abrir http://localhost:3000.
5. Probar las tres rutas, recuperación, recarga e inspección de referencias.
6. Revisar [IMPLEMENTED_V1](../architecture/IMPLEMENTED_V1.md), que describe las decisiones reales y prevalece sobre los documentos de planificación anteriores.

En el equipo original se usó `WEB_PORT=3100` porque 3000 estaba ocupado. Ese ajuste es local y no se comparte como requisito; se puede agregar `WEB_PORT=3100` al `.env` propio si hace falta.

## Qué revisar

- Semántica de la dirección `DEPENDS_ON`, radio de impacto y datos semilla.
- Contratos de pago/state/action y manejo de claves de idempotencia.
- Planes JSON del modelo limitados por agente y ejecución mediante MCP stdio.
- Handoff persistido entre agentes, referencias, incertidumbres y modos fallback.
- Configuración Gemini con modelo/cuota habilitados. Su clave se queda en su equipo.
- Idempotencia, reinicios, logs y futura coordinación si se aumenta concurrencia.
- Acceso de equipo y autenticación antes de exponer la demo en Cloud Run.

## Validación realizada

- Docker Desktop Linux iniciado y FalkorDB 4.12.0 descargado.
- Base autenticada: sin credenciales devuelve NOAUTH; con las configuradas responde PONG.
- AOF y volumen nombrado configurados; semilla idempotente de ocho servicios.
- Integración real con DB y MCP: topología, pago exitoso, timeout, despliegue correlacionado, idempotencia, separación de sesiones y recuperación sin aprobar el pago fallido.
- Build Next.js con comprobación TypeScript y endpoint proxy servidor.
- Pruebas de contrato del adaptador Ollama con respuestas controladas y corte tras fallo.

No se prueba Gemini contra una cuenta real porque no se proporcionó API key/cuota. Los tests de adaptador y el fallback no equivalen a una validación de inferencia cloud.

## Resultado del modelo local

Ollama reporta `qwen3.8:27b` (17 GB). La API Docker alcanza su endpoint en Windows. Una petición mínima directa de diagnóstico tardó aproximadamente **127.6 s**; el servidor reportó aproximadamente 60.4 s de carga y 50.9 s para generar 64 tokens. Terminó por límite de tokens y el JSON quedó incompleto. Es una medición puntual de este equipo, no un benchmark general del modelo.

Con el límite inicial de 45 s, las llamadas de la integración activaron fallback. El proveedor se corta tras el primer fallo dentro de la investigación para evitar tres esperas sucesivas. La V1 funciona con grafo/MCP y síntesis determinista; **no se afirma que una investigación completa con síntesis del modelo 27B haya pasado**. Para una demo fluida, revisar un modelo menor o probar Gemini. Cambiar tamaño/modelo no requiere modificar la lógica de negocio.

## Pendientes antes de nube

Elegir instancia FalkorDB persistente externa, región, TLS y conectividad; configurar Secret Manager e identidades; proteger acceso al frontend; revisar autenticación entre servicios; fijar máximo de instancias y timeout; confirmar modelo Gemini y presupuesto. Los scripts actuales no crean recursos GCP ni consumen API de pago automáticamente.

## Límites deliberados

Un worker y una investigación simultánea. Una sesión de demo no constituye identidad ni aislamiento empresarial. UUID de sesión se conserva en localStorage, pero secretos nunca. MCP privado no ejecuta Cypher arbitrario ni remediación. Los documentos de producto que describen A2A, otros proveedores o escalado son planes, no capacidades ejecutadas.
