# Pruebas del buscador — 14 de octubre de 2026

Respuestas reales guardadas como XML. No se incorporan a la base principal. Dos consultas concurrentes como máximo; timeout de 40 segundos. `probe_api.py` reproduce la segunda ronda.

| Consulta | Resultados | Tiempo |
|---|---:|---:|
| Neira, ID de filtro 65883, año 2026 | 322 | 7,94 s |
| 02/03/2026, sin filtro de año | 538 | 14,31 s |
| 03/03/2026, sin filtro de año | 78 | 2,67 s |
| 02–03/03/2026, sin filtro de año | 616 | 16,58 s |
| 02–03/03/2026 + año 2026 | timeout | 40 s |
| Solo año 2026 | timeout | 40 s |
| Neira usando ID de ficha 30716 | 0 | 0,48 s |

La unión de ambos días coincide exactamente, por ID, con el rango de dos días; no hay intersección entre días. Las fechas de presentación de los 616 resultados corresponden al rango pedido. Esto valida esa partición, no demuestra completitud absoluta de todo el sistema.

La consulta de Neira incluye 97 expedientes como autora y 225 como cofirmante. El filtro busca ambas funciones. El expediente de control 1-D-2026, ID 139330, aparece en la consulta correcta por autor y en la del 2 de marzo.

## Identidades distintas

`AutoCompletar.asmx/GetAutores`, POST `prefixText=NEI&count=20`, devuelve strings JSON con `First` (nombre) y `Second` (ID de filtro). Para Neira: `Second=65883`. La ficha devuelve `autor_id=30716`, que sirve para el enlace de legislador pero no para ese filtro. No mezclar ambos espacios de IDs.

El autocompletado acepta prefijo vacío; su respuesta queda en `autores_todos.xml`, normalizada en `autores.json`. Incluye autores externos e instituciones, además de legisladores; no constituye un padrón de legisladores actuales. El parámetro `count` no debe tomarse como garantía de cobertura.

## Estrategia

Recolectar por fecha de presentación con ventanas de uno o dos días, `AnioParlamentario` vacío y `Limite` vacío. Ambos extremos son inclusivos en los días probados. Guardar por `id_expediente` y validar que cada respuesta esté dentro del rango solicitado. Comparar periódicamente con consultas por autor usando IDs del autocompletado.

Para descubrir proyectos nuevos se recorren fechas recientes. Para detectar cambios de estado en proyectos antiguos hay que reconsultar esos expedientes por número/año o recorrer de nuevo sus fechas de presentación: este filtro no busca la fecha del último movimiento. La carga inicial de años completos requiere muchas consultas; medir antes de activar un refresco anual diario en Actions.
