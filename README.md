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

La carpeta `site/` es el sitio completo, sin compilación, backend ni dependencias CDN. Incluye D3 7.9.0 local, estilos, módulos JavaScript y una exportación compacta de datos (~7 MB). Los snapshots se versionan comprimidos; Pages los descomprime al publicar.

```sh
python -m http.server 8765 --bind 127.0.0.1 --directory site
```

En un clon nuevo, ejecutar primero `python tools/package_data.py unpack`. Abrir `http://127.0.0.1:8765/`. No abrir `index.html` como `file://`, porque el navegador necesita cargar el JSON por HTTP. En DreamHost, copiar el contenido descomprimido de `site/` al directorio público. Las rutas relativas funcionan también bajo un subdirectorio de GitHub Pages.

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

Sin `--refresh`, el enriquecimiento reutiliza XML en `data/enrichment/` (excluido de Git). `--refresh` vuelve a consultar padrones y sesiones. El workflow de actualización regenera `site/data/monitor.json` después de recolectar expedientes. Las exportaciones generales `proyectos.json` y `resumen.json` corresponden a la carga histórica; para el micrositio la fuente vigente es `expedientes.json` cruzada por `prepare_site.py`.

### Publicación

Repositorio: [visualizando/legisCABA](https://github.com/visualizando/legisCABA). Pages está configurado con **Source: GitHub Actions** para publicar en [visualizando.github.io/legisCABA](https://visualizando.github.io/legisCABA/). `.github/workflows/publicar.yml` publica únicamente `site/`; corre manualmente, cuando cambia el sitio en la rama predeterminada o después de una actualización exitosa. Este último disparador permite publicar los datos que guarda el bot, cuyos commits no disparan por sí solos otros workflows con `GITHUB_TOKEN`.

### Recolección programada

El workflow corre a las 09:30 UTC (06:30 en Buenos Aires) y admite ejecución manual con años específicos. Por defecto refresca todo el ciclo desde el 10/12/2023, incluidos expedientes antiguos y archivados, para detectar cambios de estado. Los resultados se guardan en commits. Requiere permiso de escritura para Actions y una rama que acepte esos commits. Los cron necesitan el workflow en la rama predeterminada y pueden demorarse.

El micrositio consume `site/data/monitor.json`; SQLite queda disponible para análisis, sin servidor de base de datos. Los snapshots comprimidos se descomprimen al iniciar la actualización; el bot vuelve a comprimirlos antes de guardar el commit.

## Evidencia y límites

Las pruebas por autor y por fecha están en [experiments/RESULTADOS.md](experiments/RESULTADOS.md). Se verificó un rango de dos días contra la unión de las consultas diarias; la combinación de fecha y año agotó el timeout. Ambos recolectores omiten ese filtro y validan las fechas devueltas. La primera carga del ciclo se completó; el esquema de refresco diario histórico sigue pendiente de ajustar.

Servicio descubierto en el [JavaScript oficial](https://parlamentaria.legislatura.gob.ar/pages/ExpedienteBusqueda.js), conservado con el HTML en `docs/api/`. No es una API documentada ni hay garantía de estabilidad.

POST a `https://parlamentaria.legislatura.gob.ar/webservices/Json.asmx/`, con `application/x-www-form-urlencoded`; devuelve XML con namespace `http://tempuri.org/`.

* `GetExpedienteByNroyAnio`: `NroExpediente`, `AnioExpediente`. Verificado con 1-D-2026, ID 139330. Fixture real en `tests/fixtures/`.
* `GetExpedienteAvanzada`: `IdProyectoTipo`, `IdAutoresInternos`, `IdUbicacion`, `IdEstado`, `Sumario`, `SumarioExacto` (0/1), `FechaDesde`, `FechaHasta` (dd/mm/yyyy), `AnioParlamentario`, `Limite`. Parámetros extraídos del buscador. El filtro de año combinado con fechas agotó el timeout; con año vacío se completó la carga del ciclo. No hay paginación visible en el cliente: `Limite` vacío replica al sitio, pero no demuestra ausencia de límite en el servidor.
* Autocompletados: `webservices/AutoCompletar.asmx/GetAutores` (verificado; IDs de filtro distintos de IDs de fichas), `GetUbicaciones`, `GetEstados` (sin probar).

El scraper usa solicitudes secuenciales, pausa y reintentos para errores de red. Rechaza respuestas inesperadas, cofirmantes desalineados y ejecuciones totalmente vacías; publica solo después de completar las consultas. Una consulta mensual vacía puede ser válida: no permite por sí sola detectar omisiones del servidor. No se infiere una etapa política simplificada: se conserva la descripción oficial.

La leyenda usa los seis espacios políticos definidos. Transformación y bloques sin correspondencia quedan en Otros; se conserva su nombre oficial en las fichas y en los datos.

### Criterios gráficos

- Mantener cada título más cerca de sus propias barras que del siguiente grupo.
- Ubicar los valores al final de sus barras o segmentos correspondientes.
- Agrupar las referencias en un recuadro gris tenue y centrado.

## Votaciones y oficialómetro

`python votes.py` consulta todas las sesiones desde el **01/01/2021** hasta hoy, los asuntos nominales (`GetVotacionesAsuntos`) y los votos individuales (`GetVotaciones`). Revisa el período completo cada semana para detectar publicaciones tardías y correcciones. Dos consultas concurrentes, pausa y reintentos, sin dependencias externas. `--until 2026-10-14` fija el corte. `--resume` reutiliza `data/vote-cache/` para retomar una carga interrumpida: **no usar para actualizar** porque conserva respuestas anteriores. El workflow siempre consulta la fuente.

La base `data/votaciones.sqlite` contiene `votaciones`, `votos` (clave votación–legislador), `votacion_expedientes` (relación múltiple) y `proyectos` (tipo, categoría y sumario). `current` conserva la última respuesta y `observations` cada contenido distinto, con fecha y hash; `runs` registra las cargas completas. Los datos originales, incluyendo repeticiones por expedientes acumulados, quedan en las observaciones. La exportación `site/data/votaciones.json` cuenta una persona una vez por ID de votación y conserva todos los expedientes asociados. No elimina votaciones anteriores por ausencia en una consulta. Un fallo de red, detalle vacío o respuesta inválida impide publicar la carga. Las discrepancias de totales se conservan y se excluyen del cálculo.

Captura al 14/10/2026: **842 votaciones únicas y 50.664 registros individuales**, en 66 de 100 sesiones consultadas. Los 842 detalles coinciden con sus totales oficiales tras deduplicar. Las 842 votaciones tienen categoría identificada mediante 686 expedientes consultados en lotes con `GetExpedienteDatosBasicos`. Hay 327 registros sin bloque histórico identificable, que se conservan pero no entran en el indicador; 146 votaciones tienen un recuento distinto de 60 personas y quedan señaladas para revisión. El oficialómetro nominal tiene 838 votaciones comparables y cuatro sin mayoría de referencia.

**La referencia es siempre el PRO**, siguiendo PRO / Unión Pro / Vamos Juntos / Vamos por más (IDs 7, 83, 86, 119), por instrucción del usuario. No hay selector para comparar con otros bloques. La posición requiere mayoría absoluta entre afirmativos, negativos y abstenciones, sin “NO VOTÓ”. Para cada bloque se dividen sus votos individuales coincidentes por sus votos emitidos comparables. Cada voto pesa igual; no se promedian porcentajes por persona o sesión. Una minoría disidente puede dejar al propio oficialismo debajo del 100%. “NO VOTÓ” se informa aparte y no equivale a ausencia.

Los bloques se asignan por fecha con `GetLegisladoresBloques`; no se imputa el bloque actual a votos anteriores. `vote_lineages.py` infiere continuidades a partir de movimientos simultáneos de al menos dos personas que representen al menos el 80% de quienes seguían teniendo un bloque identificado en ambos extremos. Se verifica tanto el origen como el destino, para evitar unir escisiones o fusiones. Cada transición registra fecha, integrantes, denominadores y decisión. Se unifican Frente de Todos → Unión por la Patria → Fuerza por Buenos Aires y UCR/Evolución → Ciudadanos Unidos/UCR. La continuidad del PRO también se fija explícitamente por instrucción del usuario. Se puede desactivar la unificación y siempre se conservan los nombres originales en el detalle nominal. La tabla de continuidades muestra los criterios y recuentos.

Los filtros de año de votación, tipo de proyecto, padrón actual y posiciones distintas se aplican al cálculo, gráfico y explorador. Las categorías coinciden con el sitio: leyes, pedidos de informes por sumario, declaraciones y otras resoluciones; se agregan otros asuntos y sin categoría. Una votación con expedientes de varios tipos puede corresponder a varias categorías, pero se cuenta una sola vez por consulta. El filtro del padrón actual limita los votos comparados; la mayoría histórica del PRO se calcula con su bloque completo. Estos filtros son independientes de los de presentación de proyectos.

**Serie histórica:** `site/data/oficialometro-historico.json` conserva las 19 series y 83 puntos originales (incluido Total) de la celda `dataBloques` del [Observable de Legislatura porteña](https://old.observablehq.com/@rusosnith/legislatura-portena), editado el 29/07/2023, con fuente [Década Votada](https://decadavotada.andytow.com/oficialism-l.php?year=2022). Son porcentajes agregados, sin denominadores ni tipos. La vista general usa **2016–2022 del Observable y 2023 en adelante de los votos oficiales**. Se guardan los nominales desde 2021 como solapamiento, sin duplicar años ni promediar fuentes. El gráfico marca el cambio de fuente y método con círculos vacíos/llenos y enlace punteado: no afirma equivalencia metodológica exacta. Con filtros no recalculables a partir del agregado (tipo, posiciones distintas, padrón actual o desagregación de bloques), se omite ese tramo y se usa únicamente la base nominal desde 2021. Las agrupaciones históricas ambiguas del notebook, como la serie conjunta IS/PTS/Sin Bloque, permanecen como series históricas separadas; no se atribuyen a un partido actual.

El gráfico permite elegir bloques, incluye tabla accesible y muestra la fuente por punto. El ranking general usa la base nominal desde 2021; al seleccionar un año que se muestra con agregados históricos, se identifican expresamente como tales. Los filtros solo cambian el análisis, no los datos descargables. La cobertura corresponde a votaciones nominales publicadas, no acredita la totalidad de decisiones del recinto. El último año es parcial.

`.github/workflows/votaciones.yml` revisa el período **cada lunes a las 10:30 UTC (07:30 de Buenos Aires)** y permite ejecución manual. Guarda SQLite y JSON comprimidos; `publicar.yml` publica Pages después de una actualización exitosa. Los recolectores comparten concurrencia para evitar escrituras simultáneas. El cron requiere el workflow en la rama predeterminada y puede demorarse.

```sh
python tools/package_data.py unpack
python votes.py
python -m unittest discover -s tests -v
node --test tests/model.test.mjs tests/votes.test.mjs
python tools/package_data.py pack
```
