# Diseño y guion de demo

## Dirección visual

Tomar como referencia la imagen adjunta: POS oscuro a la derecha y teléfono claro a la izquierda con confirmación verde. Mantener la escena del Checkout como laboratorio y el War Room como panel operativo separado. Usar base grafito/azul noche, superficies claras de lectura, verde para pago correcto, rojo para señal de falla, ámbar para impacto y etiquetas de estado siempre acompañadas de texto/icono.

La jerarquía visual del War Room debe llevar de alerta → servicio raíz → radio de impacto → evidencia → runbook. Evitar hacer que el grafo 3D sea el componente central de investigación: Cytoscape 2D es más legible para paths y relaciones. El 3D del POS sólo da claridad narrativa y atractivo.

## Secuencia narrativa (2–3 min)

1. **Contexto (10 s):** “OpsGraph conecta arquitectura, cambios, owners y runbooks para explicar un incidente.”
2. **Compra normal (15 s):** añadir producto y pulsar pagar; tarjeta/POS animados; aparece confirmación simulada en teléfono.
3. **Mostrar cambio visual de incidente (10 s):** el contexto maestro reporta un símbolo rojo cerca del segundo 8. Sincronizarlo con la señal degradada sólo tras inspeccionar el archivo y controlar su reproducción; de lo contrario, mostrar el indicador como overlay independiente.
4. **Señal (10 s):** seleccionar “timeout de Bank Connector” y hacer segunda compra o pulsar “Emitir alerta de prueba”; la respuesta de `bank-connector` vence el límite sintético y se crea `incident_id`.
5. **Triage Agent (25 s):** destaca `bank-connector` y rutas inversas hacia `payment-service`, `order-service`, `api-gateway`; muestra herramienta de grafo y handoff guardado.
6. **Investigator Agent (20 s):** muestra deploy ficticio de hace 12 min, equipo Payments y si encuentra incidentes similares. Aclara que cercanía temporal no demuestra causalidad.
7. **Runbook (15 s):** muestra procedimiento aplicable; propone verificación/circuit breaker y requiere decisión humana.
8. **Cierre (10 s):** remarcar citas al grafo y estado persistido. Si un modelo está configurado, enseñar proveedor/síntesis; si no, usar fallback estructurado.

## Estados de animación

`idle → card_presented → authorizing → approved/declined`. El contexto maestro reporta una confirmación de pago cerca del segundo 3 y un símbolo de error cerca del segundo 8. Esos tiempos son observación del usuario, no validación del archivo; comprobarlos al revisar el asset. En modo incidente, el evento visual no debe ser la única forma de iniciar el flujo: al finalizar `authorizing`, mostrar indicador rojo/ámbar y emitir evento. La transacción sigue siendo mock.

## Reutilizar el modelo 3D del usuario

El directorio `C:\Users\Zifrikc-Gaming\Desktop\GrahpAgentHackathon\Models` se menciona en el contexto. En esta revisión no inspeccioné sus archivos y no concluyo qué formatos, clips o licencias contiene. Antes de integrar el asset:

1. Identificar si existe `.glb/.gltf`, `.fbx`, `.obj` u otro; preferir `.glb` para distribución web.
2. Confirmar licencia/origen y que se permite mostrar/redistribuir el modelo.
3. Probarlo en Blender o visor glTF, verificar escala, orientación, texturas, tamaño y si incluye clips de animación.
4. Optimizar texturas/mesh si pesa demasiado; empaquetar como `frontend/public/models/pos.glb` sólo si la licencia lo permite.
5. Si no incluye animación, animar con Three.js/R3F una tarjeta separada que se mueve hacia el lector, un pulso del terminal y un icono/check en el teléfono. No es necesario riggear la máquina.
6. Si falla carga/WebGL, mostrar ilustración estática + CSS motion o botón de demo.

Para un clip preanimado incluido en glTF, usar `GLTFLoader` para cargar y `AnimationMixer` para reproducirlo; la animación de pago puede dispararse al pulsar el botón sin requerir clip dentro del asset. Referencias Three.js: https://threejs.org/manual/pages/animation-system.html y https://threejs.org/docs/pages/AnimationMixer.html.

## Assets alternativos

- [Innerscene: checkout counter with POS](https://www.innerscene.com/tools/library/3d-parts/checkout-counter-with-pos-original-retail-fixture-3fcfb566) anuncia descarga GLB y licencia CC0 en la ficha consultada; puede servir como escena simple. Revisar la licencia y los términos en el momento de descargar.
- [Poly Pizza, búsqueda POS](https://poly.pizza/search/POS) contiene resultados de terminales low-poly; revisar licencia por asset y acreditar si corresponde.
- [Sketchfab free models](https://sketchfab.com/features/free-3d-models) ofrece modelos con Creative Commons; “gratis” no equivale a libre de atribución/redistribución. Guardar nombre del autor y licencia en `ASSETS.md`/créditos.

Una animación CSS/SVG de tarjeta entrando al terminal puede cumplir el guion si encontrar/licenciar un asset ralentiza al equipo.

## Copys sugeridos

- “Pago simulado aprobado”
- “Señal de prueba: timeout de bank-connector (umbral de demo)”
- “Impacto calculado desde dependencias registradas”
- “Deploy cercano: correlación temporal, causa no confirmada”
- “Runbook sugerido. Requiere verificación humana.”
