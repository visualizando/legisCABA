# Oficialómetro: criterios y reconstrucción propia

Revisión del 15/10/2026. El cálculo usa exclusivamente los registros nominales oficiales recuperados por `votes.py`; no incorpora porcentajes del Observable.

## Fuentes metodológicas verificadas

- [Disciplina de bloques, 02/12/2013](https://www.andytow.com/blog/2013/12/02/disciplina-de-bloques/): afirmativo, negativo, abstención y ausencia son posiciones. Las votaciones tienen igual peso. Se excluyen empates en la posición del bloque.
- [Midiendo la conformidad legislativa, 07/12/2014](https://www.andytow.com/blog/2014/12/07/midiendo-la-conformidad-legislativa/): la conformidad individual compara la posición del legislador con la posición ganadora del oficialismo. Se aplica a todos los legisladores, también a bloques de uno o dos integrantes; la restricción de tres miembros corresponde al disciplinómetro, no al oficialómetro.
- [Observando la Legislatura porteña, 13/05/2017](https://www.andytow.com/blog/2017/05/13/observando-la-legislatura-portena/): Tow identifica el servicio XML oficial y describe la incorporación de unas 300 votaciones de 2016. Enlaza el registro nominal 2, de la sesión 874 del 11/08/2016, que se volvió a consultar y devuelve 60 personas.
- [Código público del gráfico](https://github.com/hhba/towlandia/blob/64257c1feef224ab11524279054f40b2e94a33c4/public/parlalines-d.php#L249): la serie anual de cada grupo utiliza `ROUND(AVG(oficialismos / votos_oficialistas),4)`. Es un promedio de tasas individuales, diferente del cociente entre las sumas de numeradores y denominadores. Revisión del repositorio: `64257c1feef224ab11524279054f40b2e94a33c4`.

El repositorio enlazado por Década Votada conserva el gráfico para cámaras nacionales, pero no publica allí el procesamiento completo de su base porteña. Por eso se documentan a continuación las reglas operativas exactas de nuestra reconstrucción; no se afirma identidad de cada resultado con una captura externa.

## Fórmula implementada

1. El oficialismo es siempre el PRO, con IDs históricos 7, 83, 86 y 119. Se determina su posición a partir de sus integrantes históricos en cada votación, antes de aplicar el filtro de legisladores actuales.
2. Se cuentan las frecuencias de las cuatro posiciones y se toma la de mayor frecuencia única. Un empate entre las más frecuentes o la falta de registros de referencia excluye esa votación. La posición ganadora se interpreta como moda única, no como una exigencia adicional de más del 50% cuando hay varias posiciones.
3. Para cada legislador dentro de cada bloque/trayectoria se cuentan coincidencias y registros en votaciones comparables. Su tasa es coincidencias/registros. El denominador incluye la no participación publicada, y no incluye votaciones fuera de los filtros, sin referencia o inconsistentes.
4. La tasa del bloque es la media aritmética de las tasas de sus legisladores. Cada persona pesa lo mismo. El gráfico repite ese cálculo para cada año y redondea el resultado a cuatro decimales, como el SQL publicado. El ranking aplica la fórmula al período seleccionado. Las agrupaciones por continuidad se realizan antes de calcular las tasas individuales y pueden desactivarse.

Ejemplo de control: una persona con dos coincidencias en dos registros y otra con cero en un registro producen una tasa de bloque de 50%, no de 66,7%. Hay pruebas que distinguen ambas fórmulas, además de pruebas de empates, abstenciones y no participación.

## Ausencia y “NO VOTÓ” en CABA

La fuente porteña entrega `votacion_tipo_descripcion` y `presente_descripcion` por separado. El primero utiliza “NO VOTÓ” tanto para personas informadas como presentes como para personas ausentes. Para aplicar el tratamiento de la no participación como posición se utiliza literalmente “NO VOTÓ” como cuarta categoría, sin convertirla en una afirmación de ausencia física.

Esta posición entra en el denominador individual y también puede ser la más frecuente del PRO. Si dos registros tienen esa misma posición, coinciden. El detalle conserva la presencia original para que el usuario pueda distinguir ambos datos. Una fila inexistente no se rellena como “NO VOTÓ”. Los registros sin bloque histórico identificable se conservan y se excluyen de la atribución por bloque.

## Alcance temporal y cobertura

Se consultaron todas las sesiones de 2014 (42) y 2015 (36): el servicio de asuntos votados no devolvió registros nominales para ellas. En 2016 se verificaron votos desde el 11 de agosto; por eso esa anualidad tiene cobertura parcial. El archivo de sesiones es anterior al archivo nominal disponible por este servicio. Esto no prueba que no haya otros documentos, taquigráficas o decisiones del recinto en años anteriores.

El recolector consulta desde el 01/01/2016 en ventanas anuales, para evitar los timeouts observados en consultas históricas demasiado amplias. Registra la primera y última votación, sesiones consultadas y sesiones con datos por año en `cobertura_anual`. La actualización semanal vuelve a consultar todo el período para incorporar publicaciones tardías y correcciones.

Los porcentajes anteriores del Observable quedan archivados como referencia, sin alimentar la visualización. Diferencias con Década Votada pueden deberse a cobertura, correcciones, períodos de pertenencia o agrupaciones distintas, aun usando la misma fórmula documentada. Por ejemplo, su ficha pública de Casielles tiene 161 votaciones para 2021 y 52 para 2022, mientras que nuestra consulta oficial devuelve 167 y 141 respectivamente: no se eliminan registros oficiales para forzar coincidencia numérica.
