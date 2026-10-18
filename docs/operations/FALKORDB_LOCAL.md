# FalkorDB: guía desde cero para OpsGraph

## Qué es y qué guarda

FalkorDB es una base de datos de grafos. Un nodo representa, por ejemplo, un servicio, equipo o incidente; una relación expresa que un servicio depende de otro o pertenece a un equipo. OpsGraph calcula el impacto recorriendo relaciones reales almacenadas en la base.

Esta versión guarda ocho servicios, sus dependencias, responsables, un runbook, un antecedente histórico, pagos ficticios, eventos, incidentes y pasos de agentes. La semilla inicial es idempotente. No guarda tarjetas reales ni contraseñas de proveedores en el grafo.

## Primera instalación (Windows)

Necesitas Docker Desktop iniciado, con motor de contenedores Linux y Git. No necesitas cuenta de FalkorDB Cloud ni instalar Python/Node para ejecutar el stack en contenedores.

```powershell
git clone https://github.com/Zifrikc/OpsGraph_MultiAgent.git
cd OpsGraph_MultiAgent
powershell -ExecutionPolicy Bypass -File scripts/setup.ps1
docker compose up -d --build
docker compose ps
```

El script crea `.env` con contraseñas aleatorias y no lo sobrescribe si ya existe. No comparte esas claves ni las sube a Git. Las imágenes y dependencias requieren Internet en el primer arranque. La semilla se carga automáticamente al iniciar la API.

Abre http://localhost:3000. El dashboard debe indicar conexión a FalkorDB. La primera construcción puede tardar varios minutos.

## Datos de conexión locales

| Campo | Desde tu equipo | Desde el contenedor de API |
|---|---|---|
| Host | `localhost` | `falkordb` |
| Puerto | `6380` | `6379` |
| Usuario | `default` | `default` |
| Contraseña | Valor de `FALKORDB_PASSWORD` en tu `.env` | Se inyecta desde `.env` |
| Grafo | `opsgraph_dev` | `opsgraph_dev` |
| TLS | No, únicamente loopback local | Red privada de Compose |

`API_TOKEN` es otro secreto: autoriza al servidor Next.js a llamar a FastAPI. No es una contraseña de FalkorDB y nunca se envía al JavaScript del navegador.

Cada compañero genera sus propias claves y su propio volumen. Para reproducir el proyecto **comparte el repositorio y esta guía; no necesita tus credenciales**. `localhost` en su computadora apunta a su propia base, no a la tuya.

## Ver la base y consultar el grafo

Compose proporciona la contraseña a `redis-cli` mediante `REDISCLI_AUTH`, sin escribirla en los comandos:

```powershell
docker compose exec falkordb redis-cli ping
docker compose exec falkordb redis-cli GRAPH.LIST
docker compose exec falkordb redis-cli GRAPH.QUERY opsgraph_dev "MATCH (s:Service) RETURN s.id, s.owner ORDER BY s.id"
docker compose exec falkordb redis-cli GRAPH.QUERY opsgraph_dev "MATCH (a:Service)-[:DEPENDS_ON]->(b:Service) RETURN a.id, b.id"
docker compose exec falkordb redis-cli GRAPH.QUERY opsgraph_dev "MATCH (i:Incident) RETURN i.id, i.status LIMIT 20"
```

Debe haber ocho nodos Service. La propia vista de observabilidad representa la topología leída desde esta base. El navegador administrativo de FalkorDB no se publica en este Compose; las consultas anteriores permiten inspección inicial sin instalar otra interfaz.

## Probar el recorrido

1. Payment studio → elegir producto → escenario timeout → pagar.
2. El backend persiste los eventos y crea un incidente.
3. Triage consulta impacto y responsables por MCP; Investigator lee el handoff persistido y consulta evidencia.
4. El dashboard muestra los servicios afectados, síntesis, modos de ejecución y fuentes.
5. Aprobar la recuperación simulada. El incidente queda resuelto; no se reintenta el pago.
6. Recargar: la sesión se recupera usando un identificador local del navegador. “Reiniciar” crea otra sesión y conserva el historial anterior.

## Ollama en tu equipo

El perfil inicial utiliza `qwen3.8:27b`, tal como aparece en tu instalación. Ollama corre en Windows; la API Docker accede mediante `http://host.docker.internal:11434`. No copies los 17 GB del modelo al repositorio ni a una imagen Docker.

```powershell
ollama list
docker compose logs --tail 30 api
```

La generación tiene timeout configurable (`MODEL_TIMEOUT_SECONDS`, 45 s por llamada inicialmente). Un modelo de 27B puede tardar mucho con CPU o RAM limitada. Si falla, el grafo y MCP siguen funcionando con plan/síntesis deterministas, y el dashboard muestra el fallback. Para un recorrido sin inferencia cambia `MODEL_PROVIDER=none` en `.env` y recrea la API:

```powershell
docker compose up -d --force-recreate api
```

## Perfil Gemini para tu compañero

Después de ejecutar `setup.ps1`, editar únicamente su `.env`:

```dotenv
MODEL_PROVIDER=google
MODEL_NAME=ID_DEL_MODELO_HABILITADO_EN_SU_CUENTA
GOOGLE_API_KEY=SU_CLAVE_LOCAL
MODEL_TIMEOUT_SECONDS=45
```

Usamos el SDK oficial `google-genai`, con salida estructurada validada. La cuenta necesita acceso y cuota para el modelo seleccionado. Una suscripción a la aplicación Gemini no garantiza acceso ni crédito a Gemini API. No hace falta instalar Ollama para usar este perfil. Reiniciar la API con el comando anterior. Nunca enviar la clave por WhatsApp, Git ni capturas.

## Persistencia y operación

```powershell
docker compose stop                 # Detiene, conserva datos
docker compose start                # Reanuda
docker compose logs --tail 50 api    # Diagnóstico
docker compose down                 # Elimina contenedores; conserva volumen
docker compose up -d                 # Reconecta el volumen
```

El volumen `opsgraph_graph-data` conserva instantáneas RDB del grafo. Redis guarda tras 60 segundos con al menos una escritura y durante un cierre limpio; un cierre brusco puede perder los cambios desde la última instantánea. No uses `docker compose down -v` salvo que quieras borrar deliberadamente la base de esta demo. No cambies la contraseña del `.env` mientras los contenedores siguen usando el valor anterior: recrea DB/API/web de forma coordinada.

En este equipo, FalkorDB v4.12.0 terminó con código 139 al reproducir `GRAPH.EFFECT` desde AOF después de reiniciar. El volumen original se respaldó en `.local/falkordb-before-recovery.tar.gz` y los directorios AOF fallidos se conservaron dentro del volumen como `appendonlydir.quarantine-*`. La configuración local usa RDB para evitar ese fallo de reinicio. Para una instalación externa o producción, el equipo debe definir una estrategia de respaldo y recuperación propia.

## Si algo falla

- Motor Docker no disponible: abrir Docker Desktop y esperar que arranque el motor Linux.
- Puerto ocupado: detener la otra instancia o cambiar únicamente el puerto publicado de Compose; entre contenedores se conservan los puertos internos.
- Backend desconectado: `docker compose ps` y logs de API; la UI no inventa un resultado exitoso cuando falla la conexión.
- `NOAUTH`/`WRONGPASS`: revisar la configuración local y recrear servicios; no publicar secretos en logs compartidos.
- Modelo ausente, timeout o cuota: usar `MODEL_PROVIDER=none` para comprobar primero el flujo de grafo, luego configurar el proveedor.
- Una investigación interrumpida no debe cobrarse ni reintentarse automáticamente. Esta es una demo de un solo worker; iniciar una nueva sesión si se interrumpe el proceso.

## Nube, después de la revisión

FalkorDB Cloud o una VM persistente reemplazarán la base local. El backend recibirá host/puerto/usuario/password/TLS de esa instancia mediante Secret Manager. El frontend seguirá sin credenciales de base. `localhost` no conecta Cloud Run con tu portátil. No publiques el puerto de la base doméstica en Internet.

Fuentes: [FalkorDB](https://docs.falkordb.com/), [índices](https://docs.falkordb.com/cypher/indexing/range-index), [Gemini structured output](https://ai.google.dev/gemini-api/docs/structured-output), [Ollama chat](https://docs.ollama.com/api/chat).
