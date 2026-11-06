# Reuniones de comisiones: fuentes y prueba de extracción

Investigación verificada el 6 de noviembre de 2026. Es viable recolectar agenda y temarios sin navegador y sin dependencias Python externas, mediante el mismo servicio público que ya usa este proyecto para expedientes. La agenda está integrada al monitor y a su workflow diario; los temarios se enlazan a la fuente oficial y no se descargan masivamente.

## Implementación del historial

`commissions.py` carga ventanas mensuales y detalles diarios, valida identidades y fechas, y guarda SQLite y JSON solo al completar la ejecución. Base: `data/comisiones.sqlite`; exportación: `site/data/comisiones.json`. La primera carga cubrió del 10/12/2023 al 5/1/2027 (incluyendo la consulta de próximas fechas), recuperó 546 agendas y 3.326 actividades únicas. Esta cobertura describe el rango consultado, no una garantía de que la fuente publique todo lo ocurrido.

La exportación conserva todas las actividades; la interfaz filtra diputados/asesores y comisiones identificadas. Incluye comisiones especiales y Labor Parlamentaria sin ID mediante una clave local basada en el nombre literal del originador; no inventa un ID oficial ni las une por semejanza textual. Las demás actividades permanecen en la base. El filtro de tipo se aplica al historial y a la agenda; el año estadístico no restringe las próximas reuniones.

Un caso discrepante: agenda 4656, reunión 29378, 5/11/2025. El calendario mensual la devuelve y el HTML oficial la muestra, pero `GetAgendasDiaById` y el detalle por reunión devolvieron XML vacío. Se conserva el evento mensual como `detalle_incompleto`; su ID de comisión 37 se recuperó por una correspondencia única observada entre el nombre mensual y los detalles de otras reuniones de la misma carga. No se inventan sala ni notas ausentes.

Tablas: `reuniones`, `versiones`, `consultas`, `observaciones`. Las versiones registran cambios de contenido en orden, incluyendo A→B→A. Las observaciones registran presencia/ausencia dentro de cada rango completado; la ausencia no se interpreta como cancelación. Los cambios previos a la primera captura no se reconstruyen. La actualización incremental refresca 90 días pasados y 60 futuros; para correcciones antiguas ejecutar una actualización completa con `--from-date 2023-12-10 --refresh`.

## Fuentes

- [Calendario parlamentario](https://parlamentaria.legislatura.gob.ar/pages/calendar.aspx) y su [JavaScript](https://parlamentaria.legislatura.gob.ar/pages/calendar.js).
- [Esquema WSDL público](https://parlamentaria.legislatura.gob.ar/webservices/Json.asmx?WSDL): permite comprobar nombres y parámetros; no implica un compromiso de estabilidad.
- [Agenda diaria 4804](https://www.legislatura.gob.ar/AgendaLCABA/4804).
- [Detalle de reunión 30445](https://www.legislatura.gob.ar/AgendaLCABADetalle/4804/30445): control visual del temario.

## Servicios verificados

Base: `https://parlamentaria.legislatura.gob.ar/webservices/Json.asmx/`.
POST con `application/x-www-form-urlencoded`; respuestas XML con namespace `http://tempuri.org/`.

| Método | Parámetros | Contenido observado |
|---|---|---|
| `GetAgendasMesCurso` | `start`, `end` | Agendas diarias con ID y fecha; raíz `ArrayOfEvents` |
| `GetAgendasMesCursoEvento` | `start`, `end`, `IdTipoReunion` vacío | Reuniones con ID, agenda, tipo, hora, comisión u originador; raíz `ArrayOfEventsTR` |
| `GetAgendasDiaById` | `idAgenda` | Fecha, comisión con ID, sala, ubicación y notas; raíz `ArrayOfEventsDay` |
| `GetExpedientesByIdReunion` | `idReunion` | Temario con ID de expediente, número, sumario, tipo y autor; raíz `ArrayOfEventsDay` |
| `GetComisionesParticipantesByIdReunion` | `idReunion` | Respuesta válida pero vacía en el control; utilidad para reuniones conjuntas pendiente de validar |

`start` y `end` son timestamps Unix en segundos. La prueba usa medianoche de Buenos Aires (UTC−3). Para septiembre: `1788231600` y `1790823600`.

## Evidencia

Ejecutar desde la raíz del repositorio:

```sh
python tools/probe_commissions.py
python tools/probe_commissions.py --month 2024-03
```

El script guarda XML originales y `resultado.json` en `experiments/comisiones/`, excluido de Git por la regla existente. Las opciones `--agenda` y `--meeting` definen un control independiente del mes consultado; por defecto usa 4804/30445. No modifica SQLite ni el micrositio.

Resultado del sondeo ejecutado:

- Septiembre de 2026: 21 agendas y 149 reuniones distintas dentro del mes.
- Tipos: 23 Diputados, 17 Asesores, 14 Especial, 94 Otro y 1 Audiencia Pública. Son categorías de la fuente; no todas son reuniones de comisión.
- Agenda 4804, 9/9/2026: 8 reuniones. La reunión 30445 corresponde a Políticas de Promoción e Integración Social, ID de comisión 50, a las 12:00 en Salón San Martín.
- Su servicio de expedientes devuelve 8 IDs distintos, coincidentes con los ocho números de la tabla HTML. El primero es 2002-D-2026, ID 141519, lo que permite unir el temario con los expedientes existentes.
- Consulta histórica de agendas de marzo de 2024: 18 filas en la respuesta original. Demuestra disponibilidad de ese mes, sin acreditar cobertura histórica completa ni validar todos sus detalles.

## Decisiones para un recolector

1. Consultar ventanas mensuales, guardar respuesta original y filtrar localmente por `fecha_agenda` o `start` dentro de `[inicio, fin)`. El servidor incluyó el 1/10 en la consulta de septiembre: 22 agendas y 155 eventos antes del filtro. Deduplicar solapamientos.
2. Usar `id_comision_agenda_reunion` como ID de agenda y `id_comision_reunion` como ID de reunión. `AgendaNro` es otro dato: en el control vale 122, mientras el ID de agenda es 4804.
3. Enriquecer cada agenda con `GetAgendasDiaById`. Ese método no devolvió expedientes en el control, aunque el JavaScript antiguo contiene código para leerlos; la fuente ejecutada manda sobre ese código.
4. Consultar el temario por reunión y unir `id_expediente` con la base actual. Conservar filas originales y deduplicar relaciones reunión–expediente al calcular cantidades: un expediente podría traer varias filas de autoría; ese caso no apareció en el control.
5. Guardar por separado comisión y originador. Empezar con tipos Diputados/Asesores y comisión identificada; revisar Especial/Otro y reuniones conjuntas antes de excluirlas definitivamente. No usar solo la presencia de la palabra «comisión» en el título.
6. Conservar `FechaAgenda` y `HoraDefinitiva` como fecha/hora publicadas, junto con los campos originales del evento. En una fila observada, `fecha_agenda` y `fch_desde_evento` tenían días diferentes; no intercambiarlos sin investigar su semántica.
7. Guardar versiones con fecha de observación y huella de contenido; refrescar agendas recientes y próximas para registrar cambios de horario o temario. Una desaparición no acredita cancelación.

Modelo sugerido: `agendas`, `reuniones`, `reunion_comision`, `reunion_expediente` y versiones/observaciones. Mantener enlaces oficiales y notas originales. Pausas, reintentos y validación de raíces XML deben seguir los criterios del recolector existente.

## Alcance pendiente

La agenda acredita convocatoria y temario publicado, no realización efectiva, asistencia, debate, dictamen ni voto. Un temario vacío no prueba que no se hayan tratado expedientes. Falta auditar cobertura del ciclo completo desde el 10/12/2023, reuniones conjuntas, cambios/cancelaciones y eventuales límites del servidor. No se inspeccionaron borradores ni se reconstruyen convocatorias anteriores a la primera captura.
