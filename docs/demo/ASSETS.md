# Assets y medios

## Imagen recibida

La imagen adjunta muestra un POS con tarjeta insertada y un teléfono que enseña una marca de aprobación y “PAYMENT RECEIVED”. Se interpreta como guía de escena para el Checkout Lab. El flujo será completamente ficticio y no implica conexión con un proveedor de pagos.

## Modelo 3D local mencionado

Ruta indicada por el usuario: `C:\Users\Zifrikc-Gaming\Desktop\GrahpAgentHackathon\Models`.

Esta ruta no está disponible en el workspace de esta tarea; no se inspeccionaron sus archivos. El equipo puede copiar al repositorio sólo el modelo que tenga derecho a usar, preferiblemente optimizado `.glb`, junto con procedencia, licencia y atribución requerida. No enlazar una ruta de escritorio local desde el frontend; mover asset aprobado a `frontend/public/models/`.

Checklist:

- [ ] Identificar nombre, autor, fuente y licencia.
- [ ] Verificar que el modelo se puede redistribuir en repositorio/demo.
- [ ] Abrir en visor, revisar texturas, escala, orientación, clips, tamaño.
- [ ] Optimizar y probar carga en laptop/juego de presentación.
- [ ] Documentar atribución y conservar licencia junto al asset.
- [ ] Fallback 2D/estático listo.

## Alternativas consultadas

- [Innerscene checkout counter with POS](https://www.innerscene.com/tools/library/3d-parts/checkout-counter-with-pos-original-retail-fixture-3fcfb566): ficha indica GLB 435 KB y CC0. Confirmar condiciones al descargar.
- [Poly Pizza POS search](https://poly.pizza/search/POS): colección de low-poly; revisar licencia de cada resultado individual.
- [Sketchfab free 3D models](https://sketchfab.com/features/free-3d-models): filtrado de modelos descargables con licencias Creative Commons; verificar atribución y permisos de modificación/uso comercial.
- [Three.js Animation System](https://threejs.org/manual/pages/animation-system.html): explicación de clips, loaders y `AnimationMixer`.

No incluir un modelo externo por su apariencia “gratuita” sin registrar licencia. Considerar crear tarjeta, check y pulso con CSS/Three.js si el asset no tiene clip, y mantener la escena ligera.
