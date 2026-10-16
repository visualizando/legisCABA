"""Build an offline cartographic prototype without changing UMAP coordinates."""
import json
import numpy as np
from scipy.ndimage import gaussian_filter
from sklearn.cluster import HDBSCAN
from semantic_pilot import ROOT, OUT

rows=json.loads((OUT/'corpus.json').read_text(encoding='utf-8'))
vectors=np.load(OUT/'minilm-vectors.npy')
xy=np.array(json.loads((OUT/'minilm-projections.json').read_text())['umap-15-17'])
candidate_labels=HDBSCAN(min_cluster_size=22,min_samples=7,copy=True).fit_predict(xy)
groups={int(k):np.flatnonzero(candidate_labels==k).tolist() for k in sorted(set(candidate_labels))}
(OUT/'atlas-spatial-clusters.json').write_text(json.dumps([{'label':k,'indices':v} for k,v in groups.items()],indent=2),encoding='utf-8')
# Candidate spatial groups were inspected through their semantic representatives.
# These editorial labels are not exhaustive classifications of every project.
specs=[
    ([0],'Isla de las mascotas','Bienestar animal','Paseadores, guarderías, protección animal y acceso de mascotas a hospitales.'),
    ([15],'Tierras de la educación','Escuelas y trayectorias educativas','Tutorías, programas educativos, currícula y condiciones de trabajo docente.'),
    ([25],'Valle de la vivienda','Emergencia y acceso habitacional','Emergencia habitacional, alquileres y personas en situación de calle.'),
    ([12],'Sierras tributarias','Impuestos y Código Fiscal','Cambios al Código Fiscal, leyes impositivas y reducciones de carga tributaria.'),
    ([6,7],'Paso de la movilidad','Tránsito y transporte','Transporte público, sistemas de pago y modificaciones al Código de Tránsito.'),
    ([18],'Costa del patrimonio','Bienes y memoria cultural','Protección de murales, archivos, colecciones y otros bienes culturales.'),
    ([17],'Archipiélago digital','Infancias, redes y apuestas','Ciberludopatía y protección de niñas, niños y adolescentes en entornos digitales.'),
    ([1],'Península electoral','Reglas de las elecciones','Código Electoral, financiamiento partidario, ficha limpia y veda electoral.'),
    ([13],'Campos del deporte','Clubes y práctica deportiva','Clubes de barrio, permisos de uso y promoción de actividades deportivas.'),
    ([2],'Islas del calendario','Días y semanas conmemorativas','Proyectos que instituyen fechas: comparten una tarea legislativa y abordan asuntos diversos.'),
]
scale=min(920/np.ptp(xy[:,0]),690/np.ptp(xy[:,1]))
points=(xy-(xy.min(0)+xy.max(0))/2)*scale+np.array([540,420])
# Same scalar on both axes. Translation/scale only; no relocation, jitter or rotation.
gw,gh=360,280
hist=np.zeros((gh,gw))
for x,y in points:
    hist[min(gh-1,int(y/840*gh)),min(gw-1,int(x/1080*gw))]+=1
density=gaussian_filter(hist,sigma=4.1)
zones=[]
for j,(labels,name,subtitle,description) in enumerate(specs):
    ids=sorted({i for label in labels for i in groups[label]})
    center=vectors[ids].mean(0)
    reps=np.array(ids)[np.argsort(-(vectors[ids]@center))[:8]].tolist()
    zones.append({'id':j,'name':name,'subtitle':subtitle,'description':description,
                  'indices':ids,'representatives':reps,'center':np.median(points[ids],axis=0).round(2).tolist()})
payload={'rows':rows,'points':points.round(4).tolist(),'zones':zones,
         'semantic_neighborhoods':np.argsort(-(vectors@vectors.T),axis=1)[:,:22].tolist(),
         'neighbors':json.loads((OUT/'minilm-neighbors.json').read_text(encoding='utf-8')),
         'density':{'width':gw,'height':gh,'values':density.round(5).ravel().tolist()},
         'people':json.loads((ROOT/'site/data/monitor.json').read_text(encoding='utf-8'))['legisladores'],
         'uninterpreted':groups[11],
         'uninterpreted_center':np.median(points[groups[11]],axis=0).round(2).tolist()}
template=(ROOT/'tools/templates/semantic_atlas.html').read_text(encoding='utf-8')
vendor=(ROOT/'site/assets/vendor/d3.v7.min.js').read_text(encoding='utf-8')
html=template.replace('__D3__',vendor).replace('__DATA__',json.dumps(payload,ensure_ascii=False).replace('<','\\u003c'))
(OUT/'atlas.html').write_text(html,encoding='utf-8')
# Keep an explicit review record, independent of the visual names.
record={'projection':'minilm / umap-15-17','spatial_candidates':'HDBSCAN on existing 2D coordinates, min_cluster_size=22, min_samples=7',
        'naming':'Editorial inspection of eight semantic representatives per named candidate; not an exhaustive thematic classification.',
        'coast':'Gaussian-smoothed visual point density; decorative terrain, no geographic or quantitative meaning.',
        'coordinate_transform':{'uniform_scale':float(scale),'translation_only':True},'zones':zones}
(OUT/'atlas-zones.json').write_text(json.dumps(record,ensure_ascii=False,indent=2),encoding='utf-8')
assert len(points)==len(rows)==2206
assert np.allclose(np.diff(points,axis=0),np.diff(xy,axis=0)*scale)
assert all(0<=i<len(rows) for z in zones for i in z['indices'])
print(OUT/'atlas.html')
