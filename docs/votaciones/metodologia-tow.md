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

## Comparación visible y filtros

El sitio muestra juntas dos medidas: **general**, sobre todas las votaciones seleccionadas, y **con disidencias**, sobre aquellas que registran al menos dos posiciones entre afirmativo, negativo y abstención en todo el recinto. La no participación por sí sola no define una disidencia. Ambas conservan la fórmula individual y el promedio por bloque; cada una tiene su propio denominador y puede incluir distintas personas si faltan registros en el subconjunto. La ausencia de votos comparables se muestra como tal, nunca como 0%.

Los filtros de año, tipos y padrón actual se aplican a las dos medidas, los dos gráficos y la tabla. Las casillas de tipos comparten módulo y estilos con Análisis; seleccionar varios tipos incluye su unión y cada ID se cuenta una sola vez. Se conserva al menos una casilla seleccionada. La selección de bloques se comparte entre los dos gráficos, que usan las mismas escalas. La búsqueda y la selección de todas/con disidencias dentro del explorador solo afectan al listado de votos.

La comparación permite observar el peso de los consensos en la tasa general. En la captura del 15/10/2026, PO en 2025 tiene 108 coincidencias sobre 172 registros (62,8%): 65/70 en asuntos sin disidencias y 43/102 (42,2%) en asuntos con disidencias. Se contrastaron registros completos directamente con la API en los IDs 2252, 2304 y 2439: el primero es una coincidencia afirmativa en una efeméride; los otros son desacuerdos en presupuesto y adhesión al RIGI. El cálculo se verificó también de forma independiente en Python.

## Trayectoria individual

Se puede agregar una persona a ambos gráficos y a la tabla anual. Es una serie adicional, identificada con línea negra discontinua, que sigue el ID de legislador a través de sus cambios de bloque. El ranking de bloques se conserva cerrado por defecto.

Cada punto individual divide las coincidencias por los registros comparables de esa persona en el año, aplicando los filtros de año, tipos y padrón actual. Usa la misma referencia histórica del PRO y las mismas exclusiones de empates e inconsistencias. Los registros con voto válido y persona identificada pueden contribuir aunque falte el bloque histórico de esa persona: ese dato solo es indispensable para atribuir al bloque, y sigue siendo indispensable para construir la posición del PRO. El detalle del punto informa los bloques conocidos del año y marca los no identificados. No se promedian tasas por cada bloque al que perteneció la persona.

Las votaciones sin fila individual no se rellenan; los años sin registros no generan puntos y la línea no une años no consecutivos. Si los filtros excluyen a la persona se indica que no hay votos comparables. La selección individual no modifica las series de los bloques ni filtra el explorador de votos. Se pueden desmarcar todos los bloques para ver solamente a la persona.

## Ausencia y “NO VOTÓ” en CABA

La fuente porteña entrega `votacion_tipo_descripcion` y `presente_descripcion` por separado. El primero utiliza “NO VOTÓ” tanto para personas informadas como presentes como para personas ausentes. Para aplicar el tratamiento de la no participación como posición se utiliza literalmente “NO VOTÓ” como cuarta categoría, sin convertirla en una afirmación de ausencia física.

Esta posición entra en el denominador individual y también puede ser la más frecuente del PRO. Si dos registros tienen esa misma posición, coinciden. El detalle conserva la presencia original para que el usuario pueda distinguir ambos datos. Una fila inexistente no se rellena como “NO VOTÓ”. Los registros sin bloque histórico identificable se conservan y se excluyen de la atribución por bloque.

## Alcance temporal y cobertura

Se consultaron todas las sesiones de 2014 (42) y 2015 (36): el servicio de asuntos votados no devolvió registros nominales para ellas. En 2016 se verificaron votos desde el 11 de agosto; por eso esa anualidad tiene cobertura parcial. El archivo de sesiones es anterior al archivo nominal disponible por este servicio. Esto no prueba que no haya otros documentos, taquigráficas o decisiones del recinto en años anteriores.

El recolector consulta desde el 01/01/2016 en ventanas anuales, para evitar los timeouts observados en consultas históricas demasiado amplias. Registra la primera y última votación, sesiones consultadas y sesiones con datos por año en `cobertura_anual`. La actualización semanal vuelve a consultar todo el período para incorporar publicaciones tardías y correcciones.

Los porcentajes anteriores del Observable quedan archivados como referencia, sin alimentar la visualización. Diferencias con Década Votada pueden deberse a cobertura, correcciones, períodos de pertenencia o agrupaciones distintas, aun usando la misma fórmula documentada. Por ejemplo, su ficha pública de Casielles tiene 161 votaciones para 2021 y 52 para 2022, mientras que nuestra consulta oficial devuelve 167 y 141 respectivamente: no se eliminan registros oficiales para forzar coincidencia numérica.
