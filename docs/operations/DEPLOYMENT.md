# Despliegue económico y opciones de nube

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
