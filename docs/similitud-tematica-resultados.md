# Resultado del primer piloto temático

Prueba ejecutada el 16/10/2026, sobre el snapshot del sitio con proyectos hasta el 14/10/2026. No se integró ni publicó una sección nueva.

## Dictamen

La exploración aporta relaciones temáticas diferentes de las cofirmas. **MiniLM multilingüe + t-SNE con perplejidad 30 es una base provisional para continuar**, no una representación validada para publicar. E5 small presenta asociaciones ajenas al tema en los casos inspeccionados. Antes de pasar al sitio conviene resolver sumarios poco informativos, probar una limpieza más dirigida y ampliar la revisión de vecinos.

El diagnóstico no es una evaluación general de estas familias de modelos: se probaron dos modelos concretos, con una limpieza conservadora y un corpus particular.

## Datos de entrada

| Control | Resultado |
|---|---:|
| Proyectos del snapshot | 9.175 |
| Proyectos de ley utilizados | 2.206 |
| IDs únicos / sumarios vacíos | 2.206 / 0 |
| Grupos de sumarios iguales normalizados | 89 |
| Expedientes en esos grupos | 188 |
| Referencias legales potencialmente insuficientes, por heurística | 143 |
| Autorías fuera del padrón de 86 legisladores del sitio | 168 |
| Sumarios truncados por los modelos | 0 en ambos |

Los controles se superponen: no deben sumarse para calcular exclusiones. Los 168 casos de autoría externa al padrón se refieren a **expedientes**, no a 168 personas distintas, y no implican error de la fuente. El universo de leyes incluye presentaciones de otras instituciones y autorías que no están en ese padrón.

Hash SHA-256 del archivo fuente: `8b2f84e5acf322a660878202c0b60d5ac99aeb10d24a25b62fd230839321d1d3`.

## Inspección de vecinos

Se revisaron los primeros cuatro vecinos de diez proyectos elegidos deliberadamente para cubrir temas y dificultades diferentes. No es una muestra aleatoria, un benchmark anotado ni una estimación de precisión del corpus completo. Los vecinos excluyen sumarios iguales al proyecto seleccionado; todavía pueden repetirse sumarios entre los propios vecinos.

| Caso | Observación |
|---|---|
| Vacunación contra el dengue, 2885-D-2023 | MiniLM recupera vacunación, prevención y emergencia por dengue. E5 ubica en segundo lugar 1121-D-2025, acompañamiento económico a víctimas de violencia de género: falso vecino temático claro. |
| Emergencia habitacional, 2832-D-2023 | Ambos recuperan emergencia habitacional, complejos habitacionales y alquileres. Un título corto puede ser informativo; no excluir por longitud solamente. |
| Alimentación escolar en vacaciones, 2790-D-2023 | MiniLM recupera comedores y alimentación educativa; en cuarto lugar aparece 1856-D-2025, cuotas alimentarias. E5 mezcla también ampliaciones de equipos de orientación escolar y permisos de ferias. |
| Olas de calor, 2791-D-2023 | MiniLM recupera primero alertas meteorológicas, pero luego relaciones más débiles. E5 trae primero atención de menopausia y climaterio. La lista fija de diez vecinos fuerza resultados incluso cuando no hay proyectos suficientemente cercanos. |
| Derogación de regulación del alquiler turístico, 612-D-2024 | Ambos recuperan iniciativas sobre derogación y alojamiento turístico. La coincidencia de tema y verbo no prueba identidad de articulado. |
| Educación como servicio esencial, 2940-D-2023 | MiniLM recupera primero otro proyecto sobre el mismo asunto. E5 también, pero mezcla enseguida esencialidad del transporte y recolección de residuos: predomina una figura regulatoria común sobre el área temática. |
| Reducción de residuos de alimentos, 240-D-2024 | MiniLM recupera desperdicio de alimentos y gestión de residuos. E5 coloca primero 1869-D-2025, reducción burocrática: falso vecino por formulación. |
| Modificación de Ley 2.148, 662-D-2024 | Ambos recuperan modificaciones de otras leyes sin tema explícito. No se puede inferir una temática confiable a partir de esos títulos. |
| Cambio de nombre de estación de subte, 2813-D-2023 | Ambos recuperan cambios de denominación de estaciones. Es una tarea legislativa compartida; no necesariamente una agenda de movilidad. |
| Eliminación de impuestos locales, 2945-D-2023 | Ambos recuperan cuestiones tributarias; E5 prioriza eliminaciones de impuestos específicos y MiniLM incluye exenciones y regularización. |

El cuaderno completo con cinco vecinos por modelo y enlaces oficiales está en `experiments/semantic-pilot/cases.md`.

### ¿Aporta algo sin cofirmas?

Sí, en los casos inspeccionados. Al excluir toda firma compartida, el proyecto de vacunación contra el dengue de Matías Barroetaveña recupera iniciativas de Gabriel Solano, María Graciela Ocaña y Cele Fierro sobre dengue. El de alimentación escolar de Alejandrina Barry recupera iniciativas de Gabriel Solano y Victoria Freire. La exclusión se aplica a autoría y a todas las coautorías, por ID; no significa que esas personas nunca hayan firmado juntas en otros expedientes.

## Comparación de proyecciones

Promedios entre semillas 17 y 42. Recuperación @15: fracción de los 15 vecinos originales que también son vecinos en 2D, sobre todos los proyectos. Trustworthiness: muestra fija de 1.000 expedientes, 15 vecinos y distancia coseno en el espacio original. Las métricas incluyen sumarios repetidos y registros ambiguos; evalúan la proyección del espacio de cada modelo, **no la corrección temática del embedding**.

| Modelo | Proyección | Recuperación @15 | Trustworthiness |
|---|---|---:|---:|
| MiniLM | UMAP, 15 vecinos | 40,7% | 0,903 |
| MiniLM | UMAP, 40 vecinos | 35,6% | 0,896 |
| MiniLM | t-SNE, perplejidad 30 | 46,3% | 0,905 |
| MiniLM | t-SNE, perplejidad 50 | 45,8% | 0,907 |
| E5 small | UMAP, 15 vecinos | 35,3% | 0,847 |
| E5 small | UMAP, 40 vecinos | 30,8% | 0,850 |
| E5 small | t-SNE, perplejidad 30 | 41,3% | 0,860 |
| E5 small | t-SNE, perplejidad 50 | 40,6% | 0,866 |

En MiniLM, UMAP de 15 vecinos conserva algo más sus vecindades entre semillas (66,1%) que t-SNE de perplejidad 30 (63,0%), aunque t-SNE retiene más vecinos originales. Esa diferencia es un intercambio entre criterios, no una superioridad universal. Los valores no justifican leer distancias entre islas ni dibujar fronteras temáticas definitivas.

## Qué queda definido y qué requiere otra prueba

- Mantener firmas fuera del embedding y ofrecer vecinos originales como evidencia principal.
- Conservar posiciones al filtrar; la selección de personas futura debe ser una superposición.
- Mantener ambos métodos en el visor de diagnóstico. Para la siguiente prueba, partir de MiniLM y t-SNE de perplejidad 30; usar una semilla fija, sin elegirla por la apariencia del mapa.
- Enriquecer o separar sumarios que solo citan leyes. No eliminarlos del archivo fuente ni inventar su tema. La heurística de 143 casos necesita revisión: no identifica toda insuficiencia posible.
- Ensayar una variante que reduzca fórmulas de apertura y comparar sus vecinos contra esta base, conservando el texto y la acción legislativa originales para inspección. La limpieza actual no elimina fórmulas de modo agresivo.
- Tratar repeticiones como multiplicidad de expedientes, sin confundirlas con más diversidad temática. Antes de publicar, repetir diagnósticos con deduplicación y sin los casos ambiguos.
- No mostrar un número fijo de recomendaciones como si todas fueran pertinentes. No fijar un umbral universal de coseno a partir de esta muestra ni comparar valores de coseno entre modelos.
- No aprobar todavía nombres de zonas, rankings de legisladores ni medidas de acuerdo político.

## Material y verificación

- Visor autónomo: `experiments/semantic-pilot/review.html`, abre sin depender de servicios externos.
- Vectores, vecinos, coordenadas, métricas, estabilidad, auditoría y versiones en la misma carpeta.
- [Método y reproducción](similitud-tematica.md).
- Scripts: `tools/semantic_pilot.py`, `tools/semantic_review.py`, `tools/check_semantic_pilot.py`; descarga alternativa con rangos limitados en `tools/download_semantic_models.py`.

Pasaron los controles de normalización y valores finitos de vectores, correspondencia de cosenos con productos escalares, ausencia de auto-vecinos, exclusión de firmas compartidas, exclusión de sumarios iguales al seleccionado y dimensiones de las 16 proyecciones. El JavaScript del visor pasó la comprobación sintáctica. La inspección visual comprobó ambos mapas, búsqueda, filtro de firmas y disposición sin desborde horizontal en viewport móvil.
