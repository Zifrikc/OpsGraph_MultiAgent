# OpsGraph AI — ampliación local V2

Esta versión es una demo ejecutable con tres tiendas ficticias que comparten ocho servicios modelados en FalkorDB. Los servicios y pagos siguen siendo simulados; la base, las consultas, la autenticación JWT, MCP y los adaptadores Ollama/Gemini son reales.

## Recorrido

1. El usuario inicia sesión como `admin`, `operator` o `viewer`. Las contraseñas únicas se generan localmente en `.env` mediante `scripts/setup.ps1`; no se suben al repositorio.
2. En Payment studio se seleccionan tienda, producto y escenario. Una petición lleva `store_id` a FastAPI. El pago y cada evento quedan asociados a la tienda.
3. Un pago aprobado abre un diálogo de éxito. Un timeout abre un diálogo de error con enlace a Observabilidad → Investigación.
4. En Observabilidad, la topología se consulta cada dos segundos desde FalkorDB. Las tiendas se conectan al gateway compartido. Las barras muestran pagos por tienda y eventos/errores por microservicio. La pestaña Explorador del grafo permite buscar servicios, seleccionar nodos e inspeccionar relaciones. Son conteos de los últimos 1.000 registros, no telemetría de infraestructura real.
5. Admin puede aprobar la recuperación simulada; el resultado aparece en un diálogo y en el panel. El pago fallido no se reintenta. Si la acción falla, aparece un error explícito.
6. Admin puede consultar el chat. El backend recupera fragmentos de runbooks desde FalkorDB y, si hay incidente, consulta herramientas MCP del grafo. La conversación queda en el grafo por sesión. La respuesta cita referencias permitidas y expone `provider_status` y el modelo. Un timeout o respuesta inválida se marca como `deterministic_fallback`.

## Acceso y roles

El navegador recibe un JWT de ocho horas en una cookie `HttpOnly` y `SameSite=Strict`. Next.js conserva el token de servicio en el servidor; FastAPI exige tanto el token de servicio como el JWT para rutas de producto. El usuario `viewer` puede leer; `operator` también puede iniciar pagos ficticios; `admin` además puede aprobar acciones y usar el chat. La API aplica estos permisos independientemente de los botones de la UI.

Esta es seguridad de demostración local: usuarios fijos y contraseñas en variables del entorno local, sin recuperación de cuentas, MFA, revocación central ni identidad empresarial. Antes de exponerla por Internet se necesita un proveedor de identidad, TLS, protección contra fuerza bruta y una política de sesiones y auditoría. No publicar `.env`.

## RAG y límites

El chat realiza recuperación acotada de tres fragmentos curados del runbook `RB-007` y evidencia de grafo por MCP. La búsqueda de chunks es léxica; todavía no usa embeddings ni un índice vectorial. Esto permite demostrar respuestas fundamentadas y citas sin añadir otra infraestructura. Para corpus empresarial, evolucionar a ingestión versionada de documentos, permisos por tienda/tenant, embeddings, búsqueda híbrida, evaluaciones de citas y control de frescura.

Las tiendas de esta V2 comparten la misma plataforma y los mismos servicios simulados. No existen procesos ni datos operativos reales de tres tiendas. El aislamiento multi-tenant empresarial, la ingestión externa de métricas y los gráficos de series temporales quedan pendientes.

## Contratos nuevos

| Ruta | Rol mínimo | Resultado |
| --- | --- | --- |
| `POST /auth/login` | token de servicio | JWT y rol |
| `GET /auth/me` | JWT | sesión actual |
| `GET /api/v1/metrics` | viewer | conteos por tienda y servicio |
| `POST /api/v1/chat` | admin | respuesta, fuentes, incertidumbres y estado del modelo |
| `GET /api/v1/chat/history/{session_id}` | admin | conversación persistida de esa sesión |

Las rutas anteriores de pago, topología, estado y recuperación conservan sus contratos con la adición de `store_id` opcional, que por compatibilidad toma `store-centro`.
