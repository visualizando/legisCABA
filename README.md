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

Identificación política: cada legislador muestra el bloque oficial de referencia y un gran grupo. Nombres y colores tomados de [Elecciones 2027 CABA](https://old.observablehq.com/@rusosnith/elecciones-2027-caba): Izquierda `#cb1f00`, Centro izquierda `#34aad7`, Centro `#00ae77`, Centro derecha `#efb118`, Derecha `#c367b3`. `political_groups.json` contiene la correspondencia editorial explícita y editable de bloques a grupos. Se muestran períodos oficiales obtenidos con `GetLegisladoresBloques`; la referencia es el bloque actual o último del ciclo, y se advierte si solo se conoce uno anterior. El color de la red identifica al grupo; los gráficos de proyectos siguen usando colores por categoría. Transformación queda “Sin clasificar” hasta definir su correspondencia.

```sh
python prepare_site.py --refresh
node --test tests/model.test.mjs
python -m unittest discover -s tests -v
```

Sin `--refresh`, el enriquecimiento reutiliza XML en `data/enrichment/` (excluido de Git). `--refresh` vuelve a consultar padrones y sesiones. El workflow de actualización regenera `site/data/monitor.json` después de recolectar expedientes. Las exportaciones generales `proyectos.json` y `resumen.json` corresponden a la carga histórica; para el micrositio la fuente vigente es `expedientes.json` cruzada por `prepare_site.py`.

### Publicación

En el repositorio GitHub, configurar **Settings → Pages → Source: GitHub Actions**. `.github/workflows/publicar.yml` publica únicamente `site/`; corre manualmente, cuando cambia el sitio en la rama predeterminada o después de una actualización exitosa. Este último disparador permite publicar los datos que guarda el bot, cuyos commits no disparan por sí solos otros workflows con `GITHUB_TOKEN`. No se ha creado un repositorio ni publicado el sitio todavía.

### Recolección programada

El workflow corre a las 09:30 UTC (06:30 en Buenos Aires) y admite ejecución manual con años específicos. Por defecto refresca el año actual y el anterior completos, incluidos expedientes archivados. Para años más antiguos ejecutar manualmente; sus cambios no se monitorean con la configuración predeterminada. Los resultados se guardan en commits. Requiere un repositorio GitHub con permiso de escritura para Actions y una rama que acepte esos commits. Los cron necesitan el workflow en la rama predeterminada y pueden demorarse.

Esta carpeta aún no es un repositorio Git y no se ha publicado ni activado el workflow. El micrositio consume `site/data/monitor.json`; SQLite queda disponible para análisis, sin servidor de base de datos.

## Evidencia y límites

Las pruebas por autor y por fecha están en [experiments/RESULTADOS.md](experiments/RESULTADOS.md). Se verificó un rango de dos días contra la unión de las consultas diarias; la combinación de fecha y año agotó el timeout. Ambos recolectores omiten ese filtro y validan las fechas devueltas. La primera carga del ciclo se completó; el esquema de refresco diario histórico sigue pendiente de ajustar.

Servicio descubierto en el [JavaScript oficial](https://parlamentaria.legislatura.gob.ar/pages/ExpedienteBusqueda.js), conservado con el HTML en `docs/api/`. No es una API documentada ni hay garantía de estabilidad.

POST a `https://parlamentaria.legislatura.gob.ar/webservices/Json.asmx/`, con `application/x-www-form-urlencoded`; devuelve XML con namespace `http://tempuri.org/`.

* `GetExpedienteByNroyAnio`: `NroExpediente`, `AnioExpediente`. Verificado con 1-D-2026, ID 139330. Fixture real en `tests/fixtures/`.
* `GetExpedienteAvanzada`: `IdProyectoTipo`, `IdAutoresInternos`, `IdUbicacion`, `IdEstado`, `Sumario`, `SumarioExacto` (0/1), `FechaDesde`, `FechaHasta` (dd/mm/yyyy), `AnioParlamentario`, `Limite`. Parámetros extraídos del buscador. El filtro de año combinado con fechas agotó el timeout; con año vacío se completó la carga del ciclo. No hay paginación visible en el cliente: `Limite` vacío replica al sitio, pero no demuestra ausencia de límite en el servidor.
* Autocompletados: `webservices/AutoCompletar.asmx/GetAutores` (verificado; IDs de filtro distintos de IDs de fichas), `GetUbicaciones`, `GetEstados` (sin probar).

El scraper usa solicitudes secuenciales, pausa y reintentos para errores de red. Rechaza respuestas inesperadas, cofirmantes desalineados y ejecuciones totalmente vacías; publica solo después de completar las consultas. Una consulta mensual vacía puede ser válida: no permite por sí sola detectar omisiones del servidor. No se infiere una etapa política simplificada: se conserva la descripción oficial.
