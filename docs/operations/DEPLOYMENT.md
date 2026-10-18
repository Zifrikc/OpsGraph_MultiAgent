# Despliegue económico y opciones de nube

## Cloud Run handoff for the current implementation

The current source has two deployable containers: `apps/web` and `apps/api`. Deploy FalkorDB separately with persistent storage and private network access; Cloud Run's instance filesystem is ephemeral. Configure the API with `FALKORDB_HOST`, `FALKORDB_PORT`, `FALKORDB_PASSWORD`, `FALKORDB_SSL`, `FALKORDB_GRAPH`, `API_TOKEN`, `AUTH_SECRET`, and role passwords. Configure the web service with `API_BASE_URL`, the same `API_TOKEN`, and its public `APP_ORIGIN`. Place all secrets in Secret Manager and grant only the relevant Cloud Run service account access. Replace the local `admin/admin` demo password before making the URL public. Use HTTPS for any bring-your-own-key input.

### Deployment templates and operator steps

1. Choose `dev`, `qa`, or `prod`. Copy `.env.deploy.<env>.example` to `.env.deploy.<env>` and `.env.cloudrun.<env>.example` to `.env.cloudrun.<env>`. The working copies are Git-ignored. Fill in the Google Cloud project, region, Artifact Registry repository, distinct API/web service accounts, image tag, FalkorDB address, and graph name. These files contain resource names and non-secret settings only.
2. Create an Artifact Registry Docker repository in the chosen region and enable the Cloud Run, Cloud Build, Artifact Registry, and Secret Manager APIs. Set up the two runtime service accounts and grant each only `roles/secretmanager.secretAccessor` on the secrets it reads. Grant the build identity permissions to build and push images, and the deployer permission to deploy both services and act as their runtime accounts. Google Cloud IAM settings depend on the project; review them with the GCP owner.
3. Provision FalkorDB separately with persistent storage and a reachable TLS endpoint. If it is reachable only through a VPC connector, set `GCP_VPC_CONNECTOR` and configure that connector first. The script does not create FalkorDB or networking. Do not put a local Docker hostname or `host.docker.internal` in the cloud template.
4. Create the Secret Manager secrets named in `.env.deploy.<env>`. Set strong, distinct values for the graph password, shared `API_TOKEN`, `AUTH_SECRET`, and the three login passwords. The API and web service must reference the **same** API token secret. Add `SECRET_GOOGLE_API_KEY` only when `MODEL_PROVIDER=google`; otherwise use `MODEL_PROVIDER=none` and let a judge supply a cloud key through the HTTPS UI if desired. Never put values in the templates or a command line that will be saved to shell history.
5. Run `python scripts/deploy_gcp.py --env dev` (or `make gcp-plan ENV=dev`) to review the selected resources. This is read-only. After reviewing it with the teammate, run `python scripts/deploy_gcp.py --env dev --apply` (or `make gcp-deploy ENV=dev`). PowerShell and POSIX wrappers are also available as `scripts/deploy_gcp.ps1` and `scripts/deploy_gcp.sh`. The script builds both images through `cloudbuild.yaml`, pushes them to Artifact Registry, deploys API then web, and sets the web origin to its actual Cloud Run URL.
6. Open the printed web URL. Check login, graph topology, a healthy mock payment, an incident, MCP evidence, and recovery. Cloud Build and Cloud Run can incur charges; configure a budget and review the deployment before `--apply`.

The template uses one API instance and one request at a time to match the current process-local investigation lock. Both Cloud Run services permit unauthenticated **invocation** for this demo; the API still checks its shared service token and user JWT for protected routes. Do not treat this as production network isolation. A private API with Cloud Run IAM identity tokens would require changes to the Next.js proxy. The template is a handoff, not proof that a cloud deployment is live.

The [Cloud Build documentation](https://docs.cloud.google.com/build/docs/deploying-builds/deploy-cloud-run) describes image builds and Cloud Run deployment. The [Cloud Run Secret Manager guide](https://docs.cloud.google.com/run/docs/configuring/services/secrets) documents environment secret references and required access.

Set `MODEL_PROVIDER=none` for a first cloud smoke run, or configure a cloud API model. Local Ollama through `host.docker.internal` works only in Docker Desktop and is not a Cloud Run model endpoint. The API currently serializes investigations in process; keep one instance for a controlled demo or add a durable queue/locking layer before scaling. The 30-store button is a bounded fixture, not a throughput benchmark. Deployment and provider keys still require the teammate's GCP project and budget configuration; no cloud credentials are included in this repository.

**Consulta realizada:** 2026-10-16. Precios/tiers cambian; revisar páginas oficiales y calculadora antes de habilitar recursos. No se puede garantizar una factura cero si se eligen servicios facturables fuera de la cuota.

## Decisión para el hackathon

**Opción preferida:** frontend y API desplegados en un servicio sencillo (Render/Railway) sólo si el endpoint demo tiene persistencia/red adecuada; FalkorDB y Ollama corren localmente durante la demo. Si conectarlos requiere publicar servicios locales, preferir presentar todo local o usar un túnel temporal autenticado y retirarlo al terminar. No exponer Redis/FalkorDB ni Ollama a Internet.

**Opción más confiable:** despliegue temporal pagado de API/grafo con créditos de cuenta y presupuesto/alertas; mantener inferencia local. Hacer una estimación con región, memoria, horas y egress; apagar/eliminar recursos al terminar. Una VM free de ~1 GB RAM no es adecuada para modelo local 9B más grafo/API/UI.

## Comparación

| Proveedor | Oportunidad | Límites relevantes | Uso adecuado |
|---|---|---|---|
| AWS | El Free Plan anunciado para nuevas cuentas ofrece hasta $200 en créditos durante 6 meses y limita servicios; no es “EC2 gratuito indefinido”. | Hay que elegir servicios elegibles; una arquitectura con VM/memoria adecuada puede consumir créditos rápidamente. | Prueba corta si alguien del equipo ya conoce AWS; fijar presupuesto y evitar GPU. |
| Google Cloud | Programa Free incluye productos siempre gratuitos; la ficha lista e2-micro sujeto a límites/regiones/horas. | Muy poca memoria; almacenamiento, IP/red, región y servicios auxiliares pueden salir del límite. | Web/API pequeña o pruebas; no alojar inferencia/gráfico completo. |
| Oracle Cloud (OCI) | La página Always Free consultada lista A1 Ampere hasta 1,500 OCPU-h y 9,000 GB-h mensuales (equivale a 2 OCPU/12 GB RAM), además de dos VM AMD pequeñas. | A1 sólo en home region; puede faltar capacidad; instancias free inactivas pueden ser reclamadas; verificar compatibilidad ARM de imágenes. | Candidato económico para API + FalkorDB pequeña, no para el modelo 27B; probar disponibilidad y cuotas de la tenancy. |
| Render | Web service/static sites y algunos datastores Free para prototipos. | Free web service duerme tras 15 min idle y despierta alrededor de 1 min; filesystem efímero; Postgres free expira tras 30 días según docs consultadas. | Frontend y demo no crítica; no para mostrar disponibilidad instantánea. |
| Railway | Free plan con $1/mes de crédito; Trial nuevo publica crédito inicial de $5 por 30 días, luego Free. | El crédito mensual es muy bajo para stack siempre activo; facturación por recursos. | Prueba temporal y servicio sencillo, vigilar consumo. |
| Local en laptop | Sin costo de nube y modelo local gratuito. | Depende de laptop, conectividad y hardware; demo accesible sólo en red/túnel controlado. | Recomendación principal para inferencia durante hackathon. |

## Arquitectura candidata de demo

```text
Browser → Frontend (Render Static / Vercel u otro) → FastAPI
                                               ↘ FalkorDB (local/red privada)
                                               ↘ Ollama (local/red privada)
```

Si frontend/APIs viven en nube pero estado/modelo sólo local, una conexión saliente segura de la laptop puede ser frágil. Alternativa: preseed + snapshot sintético en entorno remoto y mantener sin LLM o con resumen fallback; confirmar que FalkorDB se puede alojar/persistir allí antes de prometerlo. No usar base de datos free efímera para el demo final sin probar retención.

## Pasos mínimos operativos

1. Elegir una única región cercana al equipo/jurado y estimar costo en páginas de precios.
2. Desplegar UI/API; probar CORS, SSE/polling, healthchecks, cold start y límites.
3. Poner FalkorDB en red privada con autenticación y almacenamiento persistente; importar seed.
4. No desplegar Ollama en un plan pequeño; si se necesita inferencia remota, medir costo/memoria y proteger endpoint. Para hackathon, usar local.
5. Activar alertas de presupuesto/uso y confirmar cómo apagar servicios al acabar.
6. Preparar alternativa localhost, video corto y dataset seed reproducible.

## Fuentes oficiales consultadas

- AWS Free Tier: https://aws.amazon.com/free/ — hasta $200 en créditos para nueva cuenta bajo el Free Plan anunciado; condiciones vigentes en la página.
- Google Cloud Free Program: https://docs.cloud.google.com/free/docs/free-cloud-features — productos Free sujetos a regiones/uso elegible.
- Render Free: https://render.com/docs/free — límites de sleep, filesystem efímero, cuotas y retención de Postgres free.
- Render pricing: https://render.com/pricing — precios y planes publicados.
- Railway plans: https://docs.railway.com/pricing/plans — Free $1/mes y Hobby, según página consultada.
- Railway trial: https://docs.railway.com/pricing/free-trial — trial $5 hasta 30 días, luego Free.
- Oracle Cloud, [Always Free Resources](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm) — límites de cómputo, home region y política de reclaim consultados el 16-10-2026.
- Oracle Cloud, [Free Tier](https://www.oracle.com/cloud/free/) — catálogo y cuotas publicadas.

## Recomendación clara

Para mostrarlo bien y gastar lo mínimo: **local first** para el grafo y modelo; **Render Static o similar** para un frontend compartible si el equipo lo necesita; usar la instancia free sólo como preview, aceptando su cold start. Para una demo pública de horario fijo, pagar unas horas de instancia pequeña o grabar respaldo es más realista que intentar ejecutar 27B/GPU gratis en AWS/GCP.
