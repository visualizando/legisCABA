# Actualización mensual e incremental

Revisión del 6 de noviembre de 2026. La programación queda definida en
`.github/workflows/actualizar.yml`: día 2, 09:30 UTC / 06:30 Buenos Aires.
La ejecución manual usa el mismo pipeline y la rama predeterminada.

| Datos | Marca persistente | Qué se consulta |
|---|---|---|
| Expedientes | `legiscaba.sqlite`, `consultas.hasta` | Presentaciones desde el último rango completo menos el solapamiento; ventanas de dos días |
| Proyectos y resumen | Base vigente de expedientes | Exportación local, sin solicitudes adicionales |
| Padrones, bloques y mandatos | `monitor.json` | Catálogos vigentes y personas activas; se reutilizan trayectorias de quienes ya estaban inactivos |
| Asuntos considerados | `monitor.json`, `enriquecido` y `sesiones_catalogo` | Catálogo de sesiones del ciclo, detalles recientes o de IDs nuevos; se conservan los vínculos históricos |
| Votos nominales | `votaciones.sqlite`, `runs.until_date` | Sesiones pendientes, sus asuntos y votos; bloques de los participantes consultados y metadatos de expedientes nuevos |
| Comisiones | `comisiones.sqlite`, `consultas` | Desde la última consulta efectiva menos el solapamiento, hasta 60 días hacia adelante |
| Monitor de sesiones | `sesiones.json` | CSV de ScrapperTown completo, fusionado por ID con el respaldo; sin repetir el scraping oficial |

El solapamiento predeterminado es de siete días y puede cambiarse con
`--overlap-days`. Un rango completado hasta el 30/09 retoma el 24/09.
Con cero días retoma el 01/10. La marca avanza al completar todas las consultas,
incluso si no hay novedades. Una falla de red o validación no avanza la marca.
Los meses omitidos no generan huecos: se procesa todo el pendiente.

## Migración y persistencia

En la primera actualización de expedientes, si todavía no existe `consultas`,
se toma `cobertura.json.hasta`, la cobertura histórica comprobada. No se usa
la fecha del último expediente: podría haber meses sin presentaciones.
Votaciones y comisiones ya registraban ejecuciones completas en sus SQLite.
Los asuntos históricos se recuperan de `monitor.json`; no hace falta conservar
los XML de `data/enrichment/` entre runners. La nueva exportación recuerda
también los IDs de sesiones sin asuntos.

`package_data.py unpack` restaura los snapshots versionados antes de ejecutar.
`tools/update_data.py` detiene el pipeline ante el primer error y comprime solo
después de completar todos los pasos. Actions guarda un único commit al final.
Pages escucha la finalización exitosa del workflow y toma el último commit de
la rama predeterminada, incluyendo el commit de datos generado por el bot.

El workflow de verificación ejecuta Python y Node en pushes de código y PRs,
sin consultar servicios externos. La actualización mensual también verifica
los recolectores y los modelos antes de descargar datos.

## Uso y recuperación

```sh
python tools/package_data.py unpack
python tools/update_data.py
```

Si falla Actions, el repositorio conserva el snapshot completo anterior.
Reejecutar el workflow recupera el mismo período pendiente. En una ejecución
local pueden quedar cambios descomprimidos de pasos que sí terminaron; repetir
`unpack` restaura el último snapshot comprimido antes de reintentar.

Para revisar expresamente datos antiguos:

```sh
python scraper.py --years 2024 --from-date 2024-01-01
python prepare_site.py --refresh
python votes.py --since 2024-01-01 --until 2024-12-31
python commissions.py --from-date 2024-01-01 --to-date 2024-12-31 --refresh
```

Estos comandos son revisiones manuales. No modifican la programación mensual.
Después hay que regenerar las exportaciones afectadas y comprimir para conservar
los resultados. `votes.py` sin fechas sigue permitiendo una revisión completa
desde 2016. `--resume` reutiliza respuestas de una carga interrumpida y es
incompatible con `--incremental`.

## Límites y hallazgos de la revisión

- El modo incremental conserva el último estado observado de un expediente
  antiguo; no detecta sus movimientos posteriores si su presentación queda
  fuera del rango consultado. Tampoco garantiza detectar correcciones de votos
  anteriores al solapamiento. La API disponible filtra por presentación o sesión,
  sin un feed comprobado de modificaciones.
- La agenda mensual de comisiones puede quedar desactualizada entre ejecuciones.
  Se mantiene el aviso visible de captura de más de dos días y el enlace oficial.
- El atlas semántico, su revisión editorial y `oficialometro-historico.json` son
  snapshots de referencia. No se recalculan automáticamente ni se cambia su corte.
- `cobertura.json` y `controles.json` documentan la carga inicial. El resumen y
  la exportación de proyectos ahora se regeneran desde la base vigente, sin
  atribuir nuevas verificaciones a esos controles históricos.
- `data/DDJJ/` contiene documentos locales sin seguimiento en Git. No existe
  todavía un recolector, índice ni transformación de DDJJ en este proyecto.
- Las respuestas potencialmente truncadas de expedientes (1.000 registros) y
  los lotes incompletos de metadatos de votaciones impiden publicar la carga.
- Un conflicto al hacer rebase o una rama protegida detiene el guardado. No se
  usa force-push ni se sobrescriben cambios ajenos.

GitHub ejecuta los cron desde la rama predeterminada y puede demorarlos.
Los commits con `GITHUB_TOKEN` no generan otro evento de push para publicar;
por eso se conserva el encadenamiento mediante `workflow_run`.
Fuente: [documentación de eventos de GitHub Actions](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows).
