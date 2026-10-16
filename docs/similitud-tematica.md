# Piloto local de similitud temática

Alcance acordado: validar sumarios, vecinos semánticos y proyecciones antes de integrar una subsección a Análisis. No publicar ni modificar el sitio en esta etapa.

## Pregunta

¿Qué proyectos abordan temas parecidos, incluso cuando no comparten firmas? La unidad es el expediente, no el legislador. La similitud de tema no acredita coincidencia de propuestas ni acuerdo político.

## Insumos y decisiones

- Proyectos de ley de `site/data/monitor.json`; corte y hash registrados en `audit.json`. Los sumarios no sustituyen al articulado o los fundamentos.
- Firmas, bloques, fechas y estado fuera del cálculo de embeddings. Firmas utilizadas después para filtrar vecinos sin personas compartidas.
- Limpieza inicial conservadora: espacios, mayúsculas y puntuación final. Conservar verbos legislativos, negaciones, números de ley y entidades. No eliminar indiscriminadamente «créase», «modifícase» o «derógase»: describen acciones diferentes. Evaluar una limpieza mayor solo si la revisión muestra vecinos dominados por fórmulas.
- Sumarios iguales tras normalizar puntuación se identifican como grupos, sin fusionar expedientes. No implican articulado igual ni reingreso comprobado.
- Heurística de referencias legales insuficientes visible, sin excluir registros automáticamente ni completar temas por conjetura.
- Modelos comparados: `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` e `intfloat/multilingual-e5-small`. Inferencia local, vectores normalizados, similitud coseno. E5 usa `query: ` en ambos lados de esta tarea simétrica, según su ficha. Registrar versiones, revisión del modelo y truncamientos.
- Proyecciones independientes del cálculo de vecinos: UMAP (15/40 vecinos, min_dist .15, coseno) y t-SNE (perplejidad 30/50, coseno, inicialización PCA), semillas 17/42. Cada modelo tiene su propio espacio semántico de referencia.
- Mantener escala uniforme en ambos ejes de cada mapa. Los ejes no tienen interpretación temática ni unidades comparables entre mapas.

## Evaluación

1. Revisar vecinos originales, incluyendo listas que excluyen sumarios iguales y listas sin firmas compartidas. Los cosenos no son porcentajes de acuerdo y no deben compararse directamente entre modelos.
2. Seleccionar casos de salud, vivienda, educación, transporte, ambiente, administración y referencias legales ambiguas. Registrar ejemplos útiles y fallos; la inspección inicial no equivale a un benchmark anotado independiente.
3. Medir recuperación de los 15 vecinos originales en 2D (universo completo) y trustworthiness (muestra fija de 1.000 expedientes). Informar que las métricas incluyen repeticiones. Estas medidas evalúan pérdida por proyección, no pertinencia temática ni superioridad de un embedding.
4. Comparar superposición de vecinos 2D entre semillas para cada configuración. No interpretar orientación, área, densidad o distancia entre islas como medidas exactas.
5. No nombrar zonas ni generar rankings de legisladores hasta validar la representación. Posibles nombres futuros deben apoyarse en proyectos representativos y revisión humana.

## Reproducción

Entorno aislado en `.local/semantic-venv` (ignorado). Dependencias: sentence-transformers, umap-learn; scikit-learn y NumPy se instalan como dependencias. Descarga inicial de pesos desde Hugging Face; los sumarios no se envían a un servicio de embeddings.

```powershell
python -m venv .local/semantic-venv
.local/semantic-venv/Scripts/python -m pip install sentence-transformers umap-learn
.local/semantic-venv/Scripts/python tools/semantic_pilot.py --model all
.local/semantic-venv/Scripts/python tools/semantic_review.py
```

Resultados en `experiments/semantic-pilot/` (ignorados por la política existente de experiments). Los vectores se reutilizan si coincide el hash del texto. Al cambiar limpieza, modelo o revisión, invalidar la caché correspondiente. No incorporar paquetes al pipeline de producción en esta fase.

## Fuentes del método

- [MiniLM multilingüe: ficha del modelo](https://huggingface.co/sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2)
- [E5 small multilingüe: ficha del modelo](https://huggingface.co/intfloat/multilingual-e5-small)
- [Trustworthiness en scikit-learn](https://scikit-learn.org/stable/modules/generated/sklearn.manifold.trustworthiness.html)

La integración futura podrá reutilizar el lenguaje visual del sitio y su panel lateral, con puntos neutrales, autoría/coautoría como superposición y posiciones fijas al filtrar.
