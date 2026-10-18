> Documento de diseño/fase anterior. Para el estado ejecutable actual, consultar [Arquitectura V1](../architecture/IMPLEMENTED_V1.md) y [guía local](../operations/FALKORDB_LOCAL.md).

# Frontend de OpsGraph AI

## Alcance implementado

Prototipo local en Next.js, React y TypeScript. Three.js carga el modelo glTF proporcionado. Lucide aporta iconos. No hay backend, FalkorDB, MCP, inferencia ni protocolo A2A ejecutándose. Los agentes y ocho servicios son representaciones de un escenario determinista en memoria.

## Arranque en Windows

Desde la raíz del proyecto:

```powershell
cd apps/web
npm install
npm run dev
```

Abrir la dirección local que indique Next.js (habitualmente http://127.0.0.1:3000). Se necesita Node.js 20.9 o posterior compatible con Next.js 16. La instalación inicial requiere conexión con npm. No se necesitan variables de entorno, API keys ni Ollama. La tipografía puede usar Google Fonts; si no hay conexión utiliza sans-serif del sistema. El modelo se sirve desde el propio frontend.

Scripts disponibles: `dev`, `build`, `start`, `typecheck`, `format`. `format` aplica Prettier al código. `start` requiere un build previo. La demo permanece en memoria: cambiar de vista conserva el estado; recargar la página lo reinicia. No se sincronizan ventanas independientes.

## Organización real

```text
apps/web/
  app/
    layout.tsx             # Metadatos y documento
    page.tsx               # Vistas y orquestación de la sesión mock
    globals.css            # Sistema visual y adaptación móvil
  components/
    PosScene.tsx            # Carga glTF, encuadre, controles y animación
    Topology.tsx            # Grafo SVG accesible y selección de servicios
  lib/
    demo.ts                # Tipos, fixtures y transporte de eventos
  public/models/pos/
    scene.gltf
    scene.bin
    textures/
    license.txt
  package.json
  tsconfig.json
Models/                    # Originales proporcionados, conservados
docs/                      # Documentación organizada por tema
```

La estructura de arquitectura general sigue siendo una propuesta. Esta carpeta es la primera implementación concreta; no agrega servicios backend ni modifica los acuerdos pendientes.

## Vistas

### Observabilidad

Mapa inspirado en la referencia compartida: fondo oscuro, flechas de dependencias, estados verde/ámbar/rojo e inspector lateral. Ocho servicios y siete relaciones declaradas; notificaciones usa una relación discontinua de comunicación asíncrona. El nodo bancario es el origen del error inyectado. El radio de impacto contiene banco, pagos, órdenes y gateway. Los demás nodos permanecen saludables.

Selección de nodos mediante ratón o teclado, ampliación del mapa, filtro de ruta afectada, pestaña de investigación, indicadores y actividad reciente. El estado y las latencias son valores mock, no telemetría observada.

### Payment studio

Tres productos ficticios con importes en USD. Tarjeta fija de demostración sin campos de PAN/CVV. Escenarios: pago exitoso, timeout bancario, cambio reciente correlacionado con timeout. Durante la compra se bloquean los cambios y el doble envío. Un incidente pendiente debe resolverse o reiniciarse antes de otro pago.

El POS se carga desde los archivos originales copiados a `public/models/pos`. Se permite rotar y acercar. El clip original dura aproximadamente 33.375 segundos; el prototipo reproduce sus primeros segundos mientras procesa el pago (5.2 s). **No interpreta los símbolos del clip como confirmación bancaria**. La etiqueta de resultado y los eventos determinan el resultado de la simulación. La sincronización cinematográfica final queda pendiente de aprobación del flujo. Con preferencia de movimiento reducido se muestra el modelo estático. Si falla WebGL o la carga, la compra puede continuar y aparece un mensaje.

### Explorador de eventos

Filtro por nombre de evento, servicio o trace ID; inspección de JSON; descarga del registro completo. Cada evento contiene `simulated: true`. No se realiza ninguna petición de pago: `LocalEventTransport.send()` entrega los datos a sus suscriptores dentro del navegador.

## Recorrido sugerido (2–3 minutos)

1. Mostrar la topología saludable y seleccionar Payments.
2. Abrir Payment studio y elegir un producto.
3. Seleccionar “Cambio reciente + timeout”, pulsar pagar y observar POS/recorrido.
4. Abrir dashboard: cuatro nodos impactados, banco con timeout, INC-042.
5. En Investigación, mostrar Triage e Investigator (ambos simulados), correlación no confirmada y RB-007.
6. Activar “Ver ruta de impacto”.
7. Revisar y aprobar la recuperación simulada. El servicio se recupera; el pago fallido no se cobra ni se reintenta.
8. En Eventos, abrir un payload y exportar JSON para discutir el contrato con el compañero.
9. Realizar otra compra con “Pago exitoso” o reiniciar para una nueva sesión limpia.

## Contrato provisional

```typescript
type DemoEvent = {
  id: string;
  timestamp: string; // ISO UTC; la UI presenta hora local
  type: string;
  service: string;
  traceId: string;
  data: Record<string, unknown>; // incluye simulated: true
};
interface EventTransport {
  send(event: DemoEvent): void;
  subscribe(listener: (event: DemoEvent) => void): () => void;
}
```

Ejemplos de eventos: `checkout.submitted`, `identity.verified`, `order.created`, `risk.cleared`, `payment.requested`, `bank.authorization.requested`, `bank.timeout`, `incident.opened`, `triage.completed`, `evidence.correlated`, `runbook.proposed`, `runbook.approved`, `mitigation.simulated`, `incident.resolved`. La ruta feliz incluye `payment.approved`, `transaction.saved` y `receipt.sent`.

Antes de conectar un backend, acordar endpoint y transporte, validación de esquemas, autenticación, idempotencia, semántica de errores, reintentos, cancelación y fuente de verdad de los estados. El contrato actual es ilustrativo; `send` síncrono debe evolucionar si el transporte real necesita confirmación asíncrona. Las claves de proveedores y la ejecución de modelos permanecen del lado servidor.

## Diseño y accesibilidad

Paleta carbón con acentos lavanda, menta y coral; tipografía DM Sans / Manrope con fallback. Sidebar, jerarquía de indicadores, mapa como foco e inspector contextual. Adaptaciones a escritorio, tableta y móvil. Botones con etiquetas, nodos navegables, estados textuales además del color, diálogo con cierre Escape y gestión de foco, avisos `role=status`.

## Licencia del modelo

This work is based on "1 POS" (https://sketchfab.com/3d-models/1-pos-0d4121c18e4341a0839fc6f20af24b88) by abhijithsince2002 (https://sketchfab.com/abhijithsince2002) licensed under CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/).

Se conserva `license.txt` y la atribución visible en Payment studio. La presentación ajusta iluminación, encuadre y duración de reproducción; los archivos del modelo se mantienen originales.



## Estado de entrega

- Compilación de producción completada con Next.js 16.4.2, incluyendo la comprobación de TypeScript del build.
- Vista de escritorio presentada en el navegador: dashboard, POS 3D y escenario de timeout con diez eventos.
- Capturas: `payment-studio.png` y `dashboard.png`, en esta misma carpeta.
- No se agregó ni ejecutó una suite de tests automatizados. Los demás escenarios y tamaños de pantalla quedan para la revisión de QA acordada con el equipo.
- Las dependencias quedan fijadas en `apps/web/package-lock.json`; se puede usar `npm ci` para reproducir la instalación.
