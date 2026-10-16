# Atlas temático: prototipo cartográfico local

Segunda exploración, autorizada el 16/10/2026. Usa la proyección **MiniLM / UMAP, 15 vecinos, semilla 17** del primer piloto. Luego se integró, con autorización, a la sección Proyectos del sitio como mapa experimental. No sustituye los resultados de validación del piloto.

## Qué se construyó

Un atlas con continentes, islas, curvas de relieve ilustrativas y diez nombres editoriales provisionales. Cada punto conserva su posición UMAP: la única transformación de las coordenadas es una traslación y una escala uniforme. El acercamiento y desplazamiento de la cámara tampoco modifican los datos.

Las costas surgen de contornos de densidad visual suavizada con un filtro gaussiano. Los niveles, colores y umbrales sirven a la metáfora cartográfica; no son elevaciones reales, escalas de trabajo legislativo ni límites temáticos. No se añaden proyectos ficticios ni se mueven puntos para acomodarlos al terreno.

Las agrupaciones candidatas se obtuvieron con HDBSCAN sobre la proyección existente (mínimo 22 proyectos, 7 muestras). Los nombres seleccionados se contrastaron con proyectos representativos calculados en el espacio semántico original. Las agrupaciones son ayudas editoriales, no una validación nueva del embedding ni una clasificación exhaustiva.

## Nombres de esta versión

| Nombre | Referencia descriptiva |
|---|---|
| Isla de las mascotas | Bienestar animal, paseadores, guarderías y acceso a hospitales |
| Tierras de la educación | Escuelas, trayectorias educativas y docencia |
| Valle de la vivienda | Emergencia y acceso habitacional |
| Sierras tributarias | Impuestos y Código Fiscal |
| Paso de la movilidad | Tránsito y transporte; combina dos candidatos próximos |
| Costa del patrimonio | Bienes y memoria cultural |
| Archipiélago digital | Infancias, redes y apuestas |
| Península electoral | Código Electoral y reglas de elecciones |
| Campos del deporte | Clubes y práctica deportiva |
| Islas del calendario | Días y semanas conmemorativas; una tarea legislativa compartida, con temas distintos |

El sector de modificaciones normativas heterogéneas queda como **Referencias por descifrar**, sin atribuirle un tema. Los nombres geográficos son evocativos: no afirman que cada agrupación sea una isla separada según un umbral topológico. El atlas mantiene visibles las áreas que todavía no tienen nombre.

## Exploración

- Elegir una zona acerca la cámara, ilumina sus proyectos y muestra representantes. El selector permite lo mismo que los rótulos del mapa mediante teclado.
- El cuaderno de viaje cuenta zonas abiertas en la sesión. No mide aprendizaje, mérito o actividad legislativa. Se reinicia al recargar.
- Seleccionar un legislador ilumina sus autorías; una casilla permite incluir coautorías. Las firmas permanecen fuera del cálculo semántico.
- Seleccionar un proyecto muestra expediente oficial y cinco vecinos originales. La opción sin firmas compartidas utiliza el filtro validado en el primer piloto. Una lista de vecinos siempre requiere inspección: no todas las relaciones son pertinentes.
- Al seleccionar una zona, el panel muestra hasta cinco legisladores con más autorías en todos sus expedientes. Al seleccionar un punto, el universo es ese proyecto y sus 20 vecinos más próximos en el espacio semántico original. Estos 21 expedientes son un entorno exploratorio, no una categoría temática validada.
- La casilla «Incluir coautorías» también actualiza ese listado: cuenta expedientes únicos por persona y separa autorías y coautorías. No cuenta dos veces a quien figure en ambos roles. Los empates se ordenan alfabéticamente y el corte de cinco se indica. Se excluyen del listado IDs ajenos al padrón; las autorías externas se informan aparte.
- El listado no se reduce al legislador iluminado ni cambia al activar «Sin firmas compartidas», que solo filtra las recomendaciones de proyectos. Así se evita contar una muestra que excluye deliberadamente las colaboraciones. Seleccionar un nombre en el listado ilumina sus proyectos sin modificar los embeddings.
- La búsqueda por sumario o número ofrece una alternativa a elegir puntos pequeños. Hay controles de acercamiento y desplazamiento por arrastre; la rueda sigue desplazando la página.

Ejemplo comprobado: el proyecto 2427-D-2024 de bienestar animal, de Emmanuel Ferrario, recupera sin firmas compartidas iniciativas sobre animales de compañía de Yamil Santoro y Silvia Imas. Esto no implica que nunca hayan colaborado en otros proyectos ni que compartan posiciones políticas.

## Reproducción y archivos

Con el entorno y los resultados del primer piloto disponibles:

```powershell
.local/semantic-venv/Scripts/python tools/semantic_atlas.py
```

Fuente del generador: `tools/semantic_atlas.py`. Plantilla: `tools/templates/semantic_atlas.html`. Reutiliza el D3 ya incluido en el repositorio y lo incorpora al HTML; el resultado funciona sin conexiones externas.

Salidas en `experiments/semantic-pilot/` (ignoradas por la política existente):

- `atlas.html`: prototipo autónomo.
- `atlas-zones.json`: nombres, miembros, representantes, posiciones y decisiones metodológicas.
- `atlas-spatial-clusters.json`: candidatos espaciales completos.

El generador verifica cantidad de proyectos, índices válidos y preservación exacta de diferencias entre posiciones salvo la escala uniforme. La semilla, las coordenadas y las versiones del primer piloto quedan conservadas. Antes de publicar, se mantienen pendientes la revisión ampliada de sumarios ambiguos, la prueba de limpieza de fórmulas y la validación de nombres con más proyectos que los representantes.

Se comprobó el funcionamiento de selección de zonas, contador de viaje, selección de proyectos, vecinos sin firmas compartidas y autorías/coautorías. Para Ferrario coinciden con los datos 51 autorías y 103 proyectos al incluir coautorías. El atlas muestra los 2.206 puntos y no presenta desborde horizontal en un viewport de 375 píxeles. La plantilla pasa el chequeo sintáctico de JavaScript.

En el listado de la Isla de las mascotas se contrastó contra un recuento independiente: Ferrario 10 autorías; Ocaña y Yamil Santoro, 4 cada uno. Con coautorías, Ferrario suma 11 expedientes, Ocaña 9 y Hernán Reyes 8. El entorno de 2427-D-2024 contiene 21 expedientes, con 8 firmas de Ferrario (7 autorías y 1 coautoría).

## Integración en el sitio

La sección **Proyectos** tiene dos vistas con los controles existentes del sitio:

- `#proyectos`: mapa temático, con snapshot de los 2.206 proyectos de ley analizados al 14/10/2026. Controles propios de zona, legislador, coautorías y nombres. Los filtros generales del listado se ocultan aquí para no sugerir un filtrado que el mapa no aplica.
- `#proyectos/listado`: listado original, con búsqueda, filtros, paginación y acceso a expedientes y fichas. Conserva los filtros al alternar vistas.

El atlas se monta como componente en la misma página; no usa un iframe ni duplica la cabecera del sitio. Sus IDs y estilos están acotados para no interferir con el resto de las vistas. Los datos se descargan solo al entrar por primera vez al mapa y la selección se conserva al cambiar de sección.

La exportación se hace después de regenerar el prototipo local:

```powershell
python tools/export_atlas.py
```

Produce `site/assets/atlas.mjs`, `site/assets/atlas.css` y `site/data/atlas.json`. Estos archivos forman parte del sitio estático y no requieren instalar modelos, PyTorch o UMAP para servir o desplegar el sitio. El exportador usa solo la biblioteca estándar; los modelos se necesitan únicamente para rehacer el análisis semántico.

El mapa conserva su fecha de corte visible y sus firmas de ese snapshot; no se mezcla silenciosamente con posiciones o datos nuevos. La actualización diaria de `monitor.json` no recalcula embeddings ni reemplaza el snapshot del atlas. Los proyectos posteriores siguen disponibles en el listado. Para ampliar el corte se debe volver a generar el corpus, embeddings, proyecciones, revisar los grupos y volver a exportar; los nombres editoriales requieren revisión al cambiar las agrupaciones.

El mapa ocupa todo el ancho del contenido y el panel de detalle aparece debajo. Los rótulos tienen una caja más compacta y fondo semitransparente para permitir ver los puntos y el terreno a través de ellos. En pantallas estrechas, el panel inferior vuelve a una sola columna.
