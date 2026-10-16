"""Check scientific/data invariants of completed pilot artifacts."""
import json
import numpy as np
from semantic_pilot import OUT, MODELS

def read(name):return json.loads((OUT/name).read_text(encoding='utf-8'))
rows=read('corpus.json')
n=len(rows)
signs=[{p['autor']['id'],*[x['id'] for x in p['cofirmantes']]} for p in rows]
for key in MODELS:
    v=np.load(OUT/f'{key}-vectors.npy')
    assert v.shape[0]==n and np.isfinite(v).all()
    assert np.allclose(np.linalg.norm(v,axis=1),1,atol=1e-5)
    neighbors=read(f'{key}-neighbors.json')
    assert len(neighbors)==n
    for i,entry in enumerate(neighbors):
        for mode,nn in entry.items():
            indices=[x['index'] for x in nn]
            assert len(indices)==len(set(indices))==10 and i not in indices
            assert all(nn[j]['cosine']>=nn[j+1]['cosine'] for j in range(9))
            for x in nn:
                j=x['index']
                assert abs(float(v[i]@v[j])-x['cosine'])<2e-5
                if mode!='all':
                    assert not rows[i].get('duplicate_group') or rows[i]['duplicate_group']!=rows[j].get('duplicate_group')
                if mode=='unshared':assert not signs[i].intersection(signs[j])
    projections=read(f'{key}-projections.json')
    assert len(projections)==8
    assert all(np.asarray(x).shape==(n,2) and np.isfinite(x).all() for x in projections.values())
    metrics=read(f'{key}-metrics.json')
    assert {x['projection'] for x in metrics}==set(projections)
    assert all(0<=x['neighbor_recall_at_15']<=1 and 0<=x['trustworthiness_sample_1000']<=1 for x in metrics)
    print(key,': vectores, vecinos, exclusiones de firmas y 8 proyecciones verificados')
