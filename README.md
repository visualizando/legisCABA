# Monitor de la Legislatura porteña

Primera base para recolectar expedientes públicos sin navegador ni dependencias Python externas. Python 3.12+; datos en SQLite y JSON consumible por una futura web estática en GitHub Pages o DreamHost.

## Uso

```sh
python -m unittest discover -s tests -v
python scraper.py --years 2026 --number 1
python scraper.py --years 2025 2026
python backfill.py --from-date 2023-12-10 --to-date 2026-10-14
python summarize.py
```

La primera consulta es puntual. La segunda recorre ventanas de dos días de los años indicados, sin el filtro de año del servidor. `--chunk-days` permite ajustar la ventana. Cada ejecución actualiza los expedientes observados y conserva los anteriores. No interpreta ausencia como eliminación.

### Primera carga del ciclo

Se completó el rango **10/12/2023–14/10/2026**: 10.425 expedientes, incluidos **9.175 proyectos** de ley (2.206), resolución (2.638) y declaración (4.331). Los restantes son actuaciones, consideraciones, escuelas y expedientes internos, conservados para no perder información del buscador. La categoría de proyecto no implica que el autor sea necesariamente un legislador.

| Año de presentación | Proyectos | Expedientes totales |
|---|---:|---:|
| 2023, desde el 10 de diciembre | 27 | 55 |
| 2024 | 3.368 | 3.742 |
| 2025 | 2.921 | 3.343 |
| 2026, hasta el 14 de octubre | 2.859 | 3.285 |

`data/proyectos.json` contiene los proyectos; `data/expedientes.json` y SQLite contienen la base general. `data/cobertura.json` registra las 35 ventanas consultadas sin huecos ni solapamientos. `data/resumen.json` contiene estadísticas y `data/controles.json` registra el contraste: los 322 expedientes de la consulta por Neira y los 616 del control por fechas están presentes, sin faltantes. Se verificaron fechas, IDs únicos, integridad SQLite y coincidencia de cantidades entre formatos. Esto comprueba cobertura del rango consultado y de los controles, sin garantizar que el servidor público no omita registros.

`backfill.py` usa ventanas mensuales, dos consultas concurrentes y división de rangos ante timeouts o respuestas de 1.000 registros o más. Guarda XML en `data/backfill/` (excluido de Git) y permite retomar una carga interrumpida. Para refrescar el estado desde la fuente hay que eliminar o mover esa caché dentro del workspace antes de repetir: reutilizarla conserva la observación original. `summarize.py` valida la cobertura y genera la exportación de proyectos. El historial empieza en esta captura; no reconstruye todos los movimientos anteriores.

`data/expedientes.json` expone autores y cofirmantes con IDs oficiales, sumario, tipo, fechas originales, ubicación, descripción del estado, indicador de sanción y enlaces oficiales. Conserva todos los campos originales en `fuente`. `data/legiscaba.sqlite` contiene `expedientes` (última observación) y `versiones` (contenidos distintos observados). Este historial comienza con el monitor: no reconstruye movimientos anteriores. Los autores pueden ser actores institucionales, no necesariamente legisladores; no se les asigna esa categoría automáticamente.

## Micrositio HTML + D3

### Comisiones y próximas reuniones

La sección `#comisiones` muestra convocatorias por comisión y por mes, con filtros de año, tipo (diputados/asesores) y comisión. Incluye un historial desplegable con enlaces al temario oficial. La portada y la sección incorporan una mini agenda de próximas reuniones, calculada con la hora de Buenos Aires. Si la fuente no publica próximas fechas, se muestra ese estado; una captura de más de dos días lleva aviso.

```sh
python tools/package_data.py unpack
python commissions.py --refresh
python commissions.py --from-date 2023-12-10 --refresh
```

La primera carga consulta desde el 10/12/2023; con una base existente, el modo manual por defecto vuelve a consultar los últimos 90 días y los próximos 60. El workflow mensual usa `--incremental`: retoma desde la última consulta completada, con siete días de solapamiento y los próximos 60 días. La segunda variante refresca todo el ciclo. El workflow mensual de datos ejecuta el recolector y conserva `data/comisiones.sqlite.gz` y `site/data/comisiones.json.gz`; Pages los descomprime antes de publicar. `data/commission-cache/` conserva respuestas XML originales para retomar la carga inicial; `--refresh` evita reutilizar esa caché.

SQLite conserva el último contenido, versiones consecutivas distintas (incluso si un cambio se revierte), observaciones de presencia por consulta y rangos consultados. Solo se guarda una ejecución después de completar sus consultas. Las reuniones que dejan de aparecer permanecen en la base, marcadas como ausentes en el rango actualizado, sin calificarlas como canceladas.

La primera carga recuperó 3.326 actividades de 546 agendas. Las estadísticas seleccionan diputados/asesores con comisión identificada, más comisiones especiales y Labor Parlamentaria reconocidas por el nombre publicado del originador. Las reuniones conjuntas se atribuyen a la comisión principal. Son **convocatorias publicadas**, no evidencia de realización, asistencia ni dictamen. El historial de cambios empieza con la captura del 6/11/2026. Ver [fuentes y metodología](docs/api/reuniones-comisiones.md).

La carpeta `site/` es el sitio completo, sin compilación, backend ni dependencias CDN. Incluye D3 7.9.0 local, estilos, módulos JavaScript y una exportación compacta de datos (~7 MB). Los snapshots se versionan comprimidos; Pages los descomprime al publicar.

```sh
python -m http.server 8765 --bind 127.0.0.1 --directory site
```

En un clon nuevo, ejecutar primero `python tools/package_data.py unpack`. Abrir `http://127.0.0.1:8765/`. No abrir `index.html` como `file://`, porque el navegador necesita cargar el JSON por HTTP. En DreamHost, copiar el contenido descomprimido de `site/` al directorio público. Las rutas relativas funcionan también bajo un subdirectorio de GitHub Pages.

La portada (`#inicio`, también la entrada sin hash) presenta las herramientas con ilustraciones SVG locales: oficialómetro, red de legisladores y mapa temático. Las seis fichas comparten formato y preview, con accesos al panorama, las fichas y el listado de proyectos, además del enlace a metodología. El menú se oculta en el inicio y permanece disponible en las secciones. Las miniaturas combinan SVG simplificados y capturas de las herramientas reales; el contenido de bienvenida se puede leer mientras cargan los datos. Los enlaces directos existentes conservan sus destinos.

La carga inicial y las descargas diferidas de votos y atlas muestran placeholders grises adaptados a la vista. La portada y los enlaces siguen disponibles durante la descarga inicial. Los placeholders se reemplazan por datos o por el mensaje de error con su acción de reintento, sin demoras artificiales.

Secciones: panorama (composición, presentaciones mensuales y autorías), 86 fichas de legisladores del padrón oficial con participación en el ciclo o padrón activo, buscador paginado de proyectos, red D3 y metodología. Todos los gráficos y métricas usan los filtros de año de presentación y categoría. Las fichas separan autoría/coautoría; los indicadores de sanción y sesión se cuentan una vez por expediente. La red ofrece pares entre todas las firmas o solo autor-coautor, umbral de proyectos en común, zoom, selección por teclado y tabla de vínculos.

`prepare_site.py` cruza la base con `GetDiputadosHistorico`, `GetDiputadosActivosNuevo`, `GetSesionesAvanzado` y `GetAsuntosConsideradosByIdSesion`. Primera captura: 37 sesiones, 4.190 proyectos con registros en asuntos considerados y 4.117 con el indicador oficial de sanción. Se consultan todos los asuntos del rango, incluyendo sesiones con respuesta vacía. La falta de registro no prueba ausencia de tratamiento; no se mide debate individual. “Con sanción” no acredita promulgación o vigencia y puede incluir sanción inicial. Las fichas muestran el estado textual y las actuaciones con enlaces a la fuente.

Categorías: ley (2.206), declaraciones (4.331), pedidos de informes aproximados por el inicio del sumario (1.661), otras resoluciones (977). El tipo oficial permanece disponible. El año calendario de presentación puede diferir del parlamentario del número de expediente.

Identificación política: se conservan bloques y mandatos oficiales. La visualización usa la paleta indicada por el usuario: Peronismo (#34aad7), Pro y aliados (#efb118), Libertarios (#c367b3), UCR (#e86952), Izquierda (#cb1f00), Otros (#b3b3b3). La correspondencia de bloques a espacios está explícita en `prepare_site.py` y en `bloques_por_espacio` de la exportación. Es una agrupación visual, no afiliación individual ni una clasificación oficial.

La [Composición Actual oficial](https://www.legislatura.gob.ar/seccion/composicion-actual.html) carga su tabla mediante `GetDiputadosActivosNuevo`, POST `id_bloque` vacío: es el mismo servicio usado por el monitor. Verificado el 14/10/2026: 60 legisladores, sin diferencias de IDs o bloques con la captura anterior. `composicion_actual` registra fuente, fecha de consulta y cantidades por bloque; las fichas incluyen las fechas del mandato vigente. El filtro “Solo composición actual” permite explorar esos 60 legisladores dentro del padrón del ciclo. Cada actualización programada vuelve a consultar esa fuente.

```sh
python prepare_site.py --refresh
node --test tests/model.test.mjs
python -m unittest discover -s tests -v
```

Sin `--refresh`, el enriquecimiento reutiliza XML en `data/enrichment/` (excluido de Git). `--refresh` vuelve a consultar padrones y sesiones. El workflow de actualización regenera `site/data/monitor.json` después de recolectar expedientes. La actualización mensual también regenera `proyectos.json` y `resumen.json` mediante `summarize.py --current`. `cobertura.json` y `controles.json` conservan la evidencia de la carga histórica; no se presentan como verificaciones nuevas.

### Publicación

Repositorio: [visualizando/legisCABA](https://github.com/visualizando/legisCABA). Pages está configurado con **Source: GitHub Actions** para publicar en [visualizando.github.io/legisCABA](https://visualizando.github.io/legisCABA/). `.github/workflows/publicar.yml` publica únicamente `site/`; corre manualmente, cuando cambia el sitio en la rama predeterminada o después de una actualización exitosa. Este último disparador permite publicar los datos que guarda el bot, cuyos commits no disparan por sí solos otros workflows con `GITHUB_TOKEN`.

### Recolección programada

Un único workflow, `.github/workflows/actualizar.yml`, corre el **día 2 de cada mes a las 09:30 UTC (06:30 en Buenos Aires)**, después de la fecha programada de actualización del CSV externo de sesiones. También admite ejecución manual, siempre sobre la rama predeterminada. Sustituye las anteriores tareas diaria y semanal.

```sh
python tools/package_data.py unpack
python tools/update_data.py
```

El pipeline actualiza expedientes, exportaciones de proyectos y resumen, padrones y bloques, asuntos de sesiones, votaciones, comisiones y respaldo de sesiones. Conserva las bases y exportaciones comprimidas en Git. Solo comprime y guarda un commit después de completar todos los pasos; un error en Actions impide publicar una actualización parcial. En ejecución local los archivos descomprimidos de pasos completos pueden haber cambiado antes de una falla; para repetir desde el snapshot versionado, ejecutar nuevamente `unpack`.

Cada recolector retoma desde su último rango completado, con **siete días de solapamiento**. Si se saltea un mes, recupera todo el período pendiente, aunque cruce de año. Los meses vacíos también avanzan la marca. No se borra el histórico ante ausencia en una respuesta. Las marcas están en los snapshots persistentes, sin depender de Actions Cache. Más detalles y comandos de recuperación en [operación mensual](docs/actualizacion-mensual.md).

**Límite del modo incremental:** no detecta cambios de estado de expedientes antiguos ni correcciones o publicaciones tardías anteriores al solapamiento. Se conservan sus últimos datos observados; una revisión histórica se ejecuta expresamente. El atlas temático y el archivo de referencia del oficialómetro son snapshots metodológicos y quedan fuera de la actualización automática. Los PDFs locales en `data/DDJJ/` todavía no tienen recolector ni dataset integrado.

Requiere permiso de escritura para Actions y una rama que acepte los commits del bot. Los cron necesitan el workflow en la rama predeterminada y pueden demorarse. Pages publica después de una actualización exitosa y usa el último commit de esa rama. Ver [eventos de GitHub Actions](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows).

## Evidencia y límites

Las pruebas por autor y por fecha están en [experiments/RESULTADOS.md](experiments/RESULTADOS.md). Se verificó un rango de dos días contra la unión de las consultas diarias; la combinación de fecha y año agotó el timeout. Ambos recolectores omiten ese filtro y validan las fechas devueltas. La primera carga del ciclo se completó; la actualización programada ahora consulta solamente el período pendiente y el solapamiento reciente.

Servicio descubierto en el [JavaScript oficial](https://parlamentaria.legislatura.gob.ar/pages/ExpedienteBusqueda.js), conservado con el HTML en `docs/api/`. No es una API documentada ni hay garantía de estabilidad.

POST a `https://parlamentaria.legislatura.gob.ar/webservices/Json.asmx/`, con `application/x-www-form-urlencoded`; devuelve XML con namespace `http://tempuri.org/`.

* `GetExpedienteByNroyAnio`: `NroExpediente`, `AnioExpediente`. Verificado con 1-D-2026, ID 139330. Fixture real en `tests/fixtures/`.
* `GetExpedienteAvanzada`: `IdProyectoTipo`, `IdAutoresInternos`, `IdUbicacion`, `IdEstado`, `Sumario`, `SumarioExacto` (0/1), `FechaDesde`, `FechaHasta` (dd/mm/yyyy), `AnioParlamentario`, `Limite`. Parámetros extraídos del buscador. El filtro de año combinado con fechas agotó el timeout; con año vacío se completó la carga del ciclo. No hay paginación visible en el cliente: `Limite` vacío replica al sitio, pero no demuestra ausencia de límite en el servidor.
* Autocompletados: `webservices/AutoCompletar.asmx/GetAutores` (verificado; IDs de filtro distintos de IDs de fichas), `GetUbicaciones`, `GetEstados` (sin probar).

El scraper usa solicitudes secuenciales, pausa y reintentos para errores de red. Rechaza respuestas inesperadas, cofirmantes desalineados y ejecuciones totalmente vacías; publica solo después de completar las consultas. Una consulta mensual vacía puede ser válida: no permite por sí sola detectar omisiones del servidor. No se infiere una etapa política simplificada: se conserva la descripción oficial.

La leyenda usa los seis espacios políticos definidos. Transformación y bloques sin correspondencia quedan en Otros; se conserva su nombre oficial en las fichas y en los datos.

### Criterios gráficos

La sección **Proyectos** incorpora el atlas temático experimental (`#proyectos`) y conserva el listado con sus filtros (`#proyectos/listado`). El atlas es un snapshot semántico al 14/10/2026, cargado solo al abrir esa vista; no se actualiza automáticamente con el pipeline mensual. Ver [método, límites y reproducción del atlas](docs/atlas-tematico.md). Su módulo y CSS se integran en la página y reutilizan los controles del sitio; no se necesita un runtime de modelos en producción.

- Mantener cada título más cerca de sus propias barras que del siguiente grupo.
- Ubicar los valores al final de sus barras o segmentos correspondientes.
- Agrupar las referencias en un recuadro gris tenue y centrado.

## Votaciones y oficialómetro

`python votes.py` consulta votos nominales oficiales desde el **01/01/2016** hasta hoy. Recorre sesiones en ventanas anuales (`GetSesionesAvanzado`), asuntos nominales (`GetVotacionesAsuntos`) y detalles por legislador (`GetVotaciones`). La ejecución manual sin opciones revisa todo el período. El workflow mensual ejecuta `python votes.py --incremental` y consulta desde el último rango completo, con siete días de solapamiento. Dos consultas concurrentes, pausa y reintentos; sin dependencias externas. `--until 2026-10-15` fija el corte. `--resume` reutiliza `data/vote-cache/` para retomar una carga interrumpida: **no usar para refrescar**. El workflow consulta la fuente solo para el rango pendiente; reutiliza el histórico de SQLite, no la caché de respuestas.

La base `data/votaciones.sqlite` contiene `votaciones`, `votos` (clave votación–legislador), `votacion_expedientes` y `proyectos` (tipo, categoría y sumario). `current` guarda la última respuesta, `observations` los contenidos distintos con fecha y hash y `runs` las cargas completas. Se conservan respuestas originales, incluyendo las repeticiones por expedientes acumulados, pero cada persona se cuenta una vez por ID de votación en `site/data/votaciones.json`. No se borran votaciones previas porque no aparezcan en una consulta posterior. Una descarga inválida o incompleta impide publicar la carga. Los detalles con totales inconsistentes se conservan y se excluyen del indicador.

La serie completa se calcula con **nuestro propio scrapeo**, sin empalmar agregados del Observable. La primera votación nominal publicada recuperada es del **11/08/2016**; esa anualidad y el año actual son parciales. El servicio devuelve sesiones de 2014 y 2015, pero sus 42 y 36 sesiones respectivamente no devolvieron votos nominales. No se infiere que no hubo decisiones o que no existan otros documentos. `cobertura_anual` informa sesiones consultadas, sesiones con datos, votaciones y primera/última fecha de cada año. El archivo `site/data/oficialometro-historico.json` se conserva como referencia histórica, sin alimentar el cálculo ni el gráfico.

Captura del 15/10/2026: **2.275 votaciones y 136.744 registros individuales**, en 205 de las 297 sesiones consultadas desde 2016. Los totales afirmativos, negativos y abstenciones coinciden con los registros individuales en todas las votaciones. Se conservan 327 registros sin bloque histórico identificado, excluidos de la atribución por bloque.

### Criterio de Andy Tow

Ver la investigación, fuentes, fórmulas y diferencias de cobertura en [docs/votaciones/metodologia-tow.md](docs/votaciones/metodologia-tow.md).

La referencia es siempre el **PRO** en sus denominaciones históricas (IDs 7, 83, 86 y 119). La posición de referencia es la más frecuente entre afirmativo, negativo, abstención y “NO VOTÓ”; un empate entre posiciones ganadoras o falta de referencia excluye la votación. La no participación se cuenta como posición, de acuerdo con los criterios publicados por Tow. Se conserva literalmente “NO VOTÓ” sin convertirlo en ausencia física; el detalle muestra por separado la presencia informada.

Para cada persona se calcula coincidencias/registros comparables durante su pertenencia al bloque, incluyendo “NO VOTÓ” en el denominador. La tasa del bloque es el **promedio aritmético de esas tasas individuales**, no el cociente de las sumas. El gráfico repite el cálculo por año y redondea a cuatro decimales como el SQL publicado por Tow. El ranking usa la misma fórmula para el período seleccionado. Se incluyen bloques de uno o dos integrantes: la restricción de tres miembros del disciplinómetro no corresponde al oficialómetro. No se inventan registros para votaciones sin una fila de esa persona. Los registros sin bloque histórico quedan excluidos de la atribución y conservados para auditoría.

Los bloques se asignan por fecha con `GetLegisladoresBloques`. `vote_lineages.py` detecta movimientos simultáneos de al menos dos personas que representan al menos el 80% de quienes continúan con pertenencia identificable en origen y destino. Se conserva cada transición con integrantes, denominadores y decisión; las escisiones y fusiones sin esa continuidad permanecen separadas. La continuidad del PRO se fija por instrucción del usuario. Se puede desactivar la unificación; el detalle conserva siempre los nombres originales.

Los filtros de año, tipos de proyecto y padrón actual funcionan en todo el período nominal. Las categorías son las del resto del sitio (ley, informes por sumario, declaración y otras resoluciones), más otros asuntos y sin categoría. Los expedientes se consultan en lotes con `GetExpedienteDatosBasicos`. Una votación con varios tipos puede estar en varias categorías, pero se cuenta una sola vez por consulta. El padrón actual limita a las personas comparadas, no altera la posición histórica del PRO. Los filtros de votación son independientes de los filtros de presentación de proyectos.

El gráfico muestra una sola medida a la vez: **coincidencia general** o **con disidencias**, seleccionable con un control segmentado. Año, tipos y padrón actual se aplican a la medida elegida. Las casillas comparten módulo y estilos con Análisis y ofrecen Ley, Informes, Declaraciones y Otros; Otros reúne otras resoluciones, otros asuntos y registros sin categoría. Se incluye la unión de tipos sin duplicar votaciones y se conserva al menos una opción. La selección todas/con disidencias y la búsqueda del explorador afectan solo al listado. La metodología y el ranking quedan colapsados debajo del gráfico.

Las votaciones forman parte de `.github/workflows/actualizar.yml`, con una ejecución mensual compartida por todos los datasets. `publicar.yml` despliega Pages después de completar el pipeline. No queda un cron semanal independiente.
```sh
python tools/package_data.py unpack
python votes.py
python -m unittest discover -s tests -v
node --test tests/model.test.mjs tests/votes.test.mjs
python tools/package_data.py pack
```

La sección Votaciones prioriza el gráfico. El buscador de legisladores agrega una trayectoria individual negra discontinua que sigue a la persona a través de cambios de bloque. El autocompletado admite flechas, Enter y Escape. Las series y rótulos se destacan completos al apuntar un punto o enfocarlos con teclado; líneas verticales marcan 2019 y 2023. La tabla visible y la selección de bloques se retiraron; se conserva una tabla accesible.

“Copiar imagen” escribe el PNG del gráfico en el portapapeles y “Bajar imagen” lo descarga. Ambas exportaciones incluyen título, filtros y fuente, con resolución doble y sin el resaltado temporal del mouse. La copia muestra un mensaje de recuperación si el navegador no permite escribir imágenes.

Por defecto, Votaciones reúne “Bloques peronistas” y “Bloques de izquierda” desde 2016. “Agrupar por espacio político” permite volver a los bloques originales. La agrupación se aplica antes del cálculo: cada persona tiene una tasa anual única dentro del conjunto, aunque cambie de bloque, y después se promedian las tasas individuales. Los miembros exactos están documentados en `docs/votaciones/metodologia-tow.md`; la fuente nominal y la referencia del PRO se conservan.


## Monitor de sesiones

La sección `#sesiones` adapta en D3 local los gráficos del notebook de @rusosnith: calendario por fecha y tipo, acumulado anual exacto, evolución de totales y barras por año y tipo. Estas últimas unifican las dos versiones originales mediante **Total del año / Hasta el día y mes de cada año**, con el corte hasta hoy seleccionado por defecto. El tipo de sesión filtra todos los gráficos; un selector destaca un año. Hay tablas de datos y enlaces oficiales.

La fuente sigue siendo el [CSV de ScrapperTown](https://github.com/rusosnith/ScrapperTown), generado por `scrape_sesiones.py` (distinto de `scraper_legiscaba.py`, que recolecta legisladores). Su workflow `scraper_sesiones.yml` está programado para el día 1 de cada mes a las 09:00 UTC (06:00 de Buenos Aires), con ejecución manual disponible. El modo automático conserva el histórico y consulta desde la última fecha guardada; no revisa correcciones ni publicaciones tardías de fechas anteriores. Configuración verificada el 06/11/2026. No se duplica el scraper: el navegador intenta leer el CSV directamente (timeout de 8 segundos) y usa `site/data/sesiones.json` si falla. La sección indica si usa respaldo, su fecha de captura y la última fecha de sesión, sin confundir esta última con una actualización. `python tools/sync_sessions.py` actualiza el respaldo de forma atómica y con validación; se ejecuta en el workflow mensual. El CSV completo se descarga porque la fuente no ofrece deltas; se fusiona por ID con el respaldo existente, conservando sesiones históricas omitidas por la fuente y aceptando correcciones explícitas. No vuelve a scrapear esas sesiones. Un error impide reemplazar el archivo vigente.

Se deduplica por ID y se agrupa por año calendario. Las fechas se comparan como ISO y se ubican sobre un calendario bisiesto común para evitar desplazamientos por zona horaria o por años bisiestos. Hasta hoy incluye el mismo día y mes de cada año (29/2 solo cuando existe). Se excluyen fechas futuras; se conservan años con cero sesiones en el filtro seleccionado. Los acumulados son escalones exactos, sin bins ni suavizado. La curva de totales usa interpolación monótona y se colorea en amarillo desde 2008 para señalar los gobiernos del PRO; los puntos conservan los totales exactos. Los tipos usan la paleta predeterminada Observable10 y su dominio alfabético, como en el notebook. El acumulado mantiene escalones exactos, con referencia visible de grises de claro a oscuro según año y rojo destacado de mayor grosor, y muestra el año al margen derecho al recorrer una línea o enfocarla con teclado. No se muestran los desplegables de acumulados mensuales ni de cantidades por tipo; estas últimas conservan su tabla accesible. La cobertura y los años inicial/actual pueden ser parciales.

Verificación: `node --test tests/sessions.test.mjs`.

La curva anual marca cortes en 2000, 2004, 2008, 2012, 2016, 2020 y 2024, con grilla vertical y nombres de gobiernos. El tramo 2004–2007 se rotula Telerman por el criterio de presentación solicitado; la metodología conserva la aclaración de que el período también incluye a Ibarra. Se omite el eje Y y se etiqueta el máximo de cada período (ante empate, el primer año). Los cortes representan agrupaciones de años calendario, no fechas exactas de asunción. En pantallas pequeñas la curva se puede desplazar horizontalmente para conservar rótulos legibles.
