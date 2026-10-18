# Ollama y modelo local

## Inventario recibido

El usuario reportó `qwen3.8:27b`, tamaño mostrado de 17 GB, con 32 GB RAM instalada (aprox. 29 GB disponibles). Ese tag y tamaño se toman como dato proporcionado; no se pudieron validar desde el equipo ni inspeccionar el modelo. 17 GB de pesos no equivalen a 17 GB de RAM total: inferencia requiere memoria adicional para contexto/KV cache, runtime y sistema. Con Docker, FalkorDB, navegador y entorno de desarrollo abiertos, el modelo 27B puede competir por memoria y volverse lento o forzar swapping.

## Orden de evaluación recomendado

1. **Primero, probar el modelo que ya tienes:** `qwen3.8:27b` exactamente como aparece en `ollama list`. No asumir que su tag equivale a Qwen3.5 u otra familia. La RTX 3050 tiene sólo 4 GB de VRAM según el contexto maestro, así que parte del modelo probablemente correrá en RAM/CPU. Con 32 GB RAM puede competir con navegador, backend, base y contexto; medir si es usable antes de descargar otro.

2. **Alternativa pequeña si 27B no rinde:** el catálogo oficial consultado lista `qwen3:4b` alrededor de 2.5–2.6 GB. Comando:

   ```powershell
   ollama pull qwen3:4b
   ollama run qwen3:4b
   ```

3. **Alternativa intermedia sólo si hace falta:** después de medir 4B, comparar un 8B sin cargarlo en paralelo con el 27B.

   ```powershell
   ollama pull qwen3:8b
   ollama run qwen3:8b
   ```

4. **Comparación:** medir la misma alerta con 27B, 4B y opcional 8B: JSON válido, fidelidad a la evidencia, duración y memoria pico con UI, FalkorDB y backend activos. Los agentes pueden compartir el modelo y ejecutarse en secuencia; no cargar pesos separados.

Verificar tags y tamaños en Ollama antes de descargar. El tag local reportado se conserva tal cual, sin inferir la familia del modelo.

## Configuración práctica de contexto

- `num_ctx`: 4096 de inicio, aumentar a 8192 si el análisis y el JSON requieren más contexto.
- `temperature`: 0–0.2 para respuestas estructuradas reproducibles.
- Límite de salida para JSON; validar con Pydantic y una reparación controlada o fallback, no asumir formato válido.
- Un request de inferencia a la vez durante la demo; ejecutar los dos agentes en secuencia sobre los mismos pesos para cuidar RAM/VRAM.
- Mantener el prompt breve y pasar evidencia estructurada, no el grafo completo.
- Si hay GPU, dejar margen de VRAM; si CPU-only, probar tiempos y precalentar modelo antes de la presentación.

## Prueba corta de rendimiento

1. `ollama list` y anotar tag exacto/quantization.
2. Arrancar FalkorDB, frontend, backend y modelo; observar memoria disponible.
3. Ejecutar 10 veces la misma síntesis con evidencia fija; anotar p50/p95, fallos JSON, memoria máxima y cambios de estado.
4. Repetir con contexto 4096 y 8192; usar el menor que mantenga buena respuesta.
5. Hacer demo completa con y sin Ollama. El escenario y paths no deben depender del texto generado.

## Selección en runtime

Configurar `MODEL_PROVIDER=ollama`, `OLLAMA_BASE_URL=http://localhost:11434` y `MODEL_NAME=qwen3:4b` o el modelo probado (ejemplo). API solicita salida JSON si el modelo lo soporta; aplica timeout; registra modelo/latencia sin guardar datos sensibles. El modo `fallback` resume determinísticamente servicios, rutas, deploy y runbook obtenidos del grafo.

## Fuentes

- Ollama tags de Qwen 3: https://ollama.com/library/qwen3/tags
