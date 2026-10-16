"""Local, reproducible semantic pilot; never writes into site/."""
import argparse
import collections
import hashlib
import importlib.metadata
import json
import os
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'experiments' / 'semantic-pilot'
os.environ.setdefault('HF_HOME', str(ROOT / '.local' / 'huggingface'))
os.environ.setdefault('HF_HUB_DISABLE_XET', '1')
os.environ.setdefault('TOKENIZERS_PARALLELISM', 'false')

MODELS = {
    'minilm': 'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2',
    'e5': 'intfloat/multilingual-e5-small',
}

def clean(text):
    # Preserve verbs, negation, accents, entities and law numbers.
    text = re.sub(r'\s+', ' ', text).strip().lower()
    return re.sub(r'[.\s;–—-]+$', '', text)

def corpus():
    raw = (ROOT / 'site/data/monitor.json').read_bytes()
    data = json.loads(raw)
    roster={p['id'] for p in data['legisladores']}
    projects = sorted((p for p in data['proyectos'] if p['categoria'] == 'ley'),
                      key=lambda p: (p['fecha'], p['id']))
    rows = []
    for p in projects:
        text = clean(p['sumario'])
        flags = []
        # Shortness alone is not evidence of insufficient information.
        if re.fullmatch(r'(?:modif[ií]ca(?:se|nse)|der[oó]ga(?:se|nse))\s+(?:(?:el|la|los|las)\s+)?(?:art[ií]culos?.*?de\s+la\s+)?ley\s*(?:n[°ºo.]?\s*)?[\d.\s, y]+', text):
            flags.append('referencia legal sin tema explícito')
        rows.append({k:p[k] for k in ('id','numero','fecha','sumario','url','autor','cofirmantes')} |
                    {'text':text,'flags':flags,'author_in_roster':p['autor']['id'] in roster})
    groups = collections.defaultdict(list)
    for i,p in enumerate(rows):
        groups[re.sub(r'\W+', ' ', p['text']).strip()].append(i)
    duplicates = [v for v in groups.values() if len(v)>1]
    for group in duplicates:
        for i in group: rows[i]['duplicate_group'] = rows[group[0]]['id']
    OUT.mkdir(parents=True, exist_ok=True)
    audit = {'source_sha256':hashlib.sha256(raw).hexdigest(), 'total_projects':len(data['proyectos']),
             'laws':len(rows),'first_date':rows[0]['fecha'],'last_date':rows[-1]['fecha'],
             'duplicate_groups':len(duplicates),'projects_in_duplicate_groups':sum(map(len,duplicates)),
             'under_9_words':sum(len(p['text'].split())<9 for p in rows),
             'flagged':sum(bool(p['flags']) for p in rows),
             'authors_outside_roster':sum(not p['author_in_roster'] for p in rows),
             'duplicate_ids':[[rows[i]['id'] for i in g] for g in duplicates]}
    save('corpus.json',rows)
    save('audit.json',audit)
    return rows,audit

def save(name, obj):
    (OUT/name).write_text(json.dumps(obj, ensure_ascii=False, indent=2),encoding='utf-8')

def encode(key,rows):
    import numpy as np
    import torch
    from sentence_transformers import SentenceTransformer
    torch.set_num_threads(min(8,os.cpu_count() or 2))
    texts=[p['text'] for p in rows]
    digest=hashlib.sha256(json.dumps(texts,ensure_ascii=False).encode()).hexdigest()
    path=OUT/f'{key}-vectors.npy'
    meta_path=OUT/f'{key}-embedding.json'
    if path.exists() and meta_path.exists() and json.loads(meta_path.read_text())['text_sha256']==digest:
        return np.load(path)
    local = ROOT / '.local' / 'semantic-models' / key
    model=SentenceTransformer(str(local) if local.exists() else MODELS[key],device='cpu',trust_remote_code=False)
    if key=='e5':texts=['query: '+s for s in texts]  # Symmetric similarity, model-card convention.
    lengths=[len(model.tokenizer(s)['input_ids']) for s in texts]
    meta={'model':MODELS[key],'text_sha256':digest,'max_seq_length':model.max_seq_length,
          'truncated':sum(n>model.max_seq_length for n in lengths),
          'revision':getattr(model[0].auto_model.config,'_commit_hash',None),
          'versions':{p:importlib.metadata.version(p) for p in ['sentence-transformers','torch','transformers','numpy','scikit-learn','umap-learn']}}
    if (local/'download-manifest.json').exists():
        meta['revision']=json.loads((local/'download-manifest.json').read_text())['revision']
    vectors=model.encode(texts,batch_size=32,normalize_embeddings=True,show_progress_bar=True)
    np.save(path,vectors)
    save(f'{key}-embedding.json',meta)
    return vectors

def evaluate(key,rows,vectors):
    import numpy as np
    from sklearn.manifold import TSNE,trustworthiness
    from sklearn.metrics import pairwise_distances
    from umap import UMAP
    distances=pairwise_distances(vectors,metric='cosine')
    np.fill_diagonal(distances,np.inf)
    original=np.argsort(distances,axis=1)[:,:15]
    neighbors=[]
    for i,row in enumerate(rows):
        candidates=np.argsort(distances[i])
        ordinary=[];distinct=[];unshared=[]
        signs={row['autor']['id'],*[x['id'] for x in row['cofirmantes']]}
        for j in candidates:
            if i==j:continue
            item={'index':int(j),'cosine':round(float(1-distances[i,j]),6)}
            if len(ordinary)<10:ordinary.append(item)
            same=row.get('duplicate_group') and row.get('duplicate_group')==rows[j].get('duplicate_group')
            if same:continue
            if len(distinct)<10:distinct.append(item)
            other={rows[j]['autor']['id'],*[x['id'] for x in rows[j]['cofirmantes']]}
            if not signs.intersection(other) and len(unshared)<10:unshared.append(item)
            if len(ordinary)==len(distinct)==len(unshared)==10:break
        neighbors.append({'all':ordinary,'distinct':distinct,'unshared':unshared})
    save(f'{key}-neighbors.json',neighbors)
    projections={};metrics=[];knns={}
    for method in ['umap','tsne']:
        for setting in ([15,40] if method=='umap' else [30,50]):
            for seed in [17,42]:
                name=f'{method}-{setting}-{seed}'
                print(key,name,flush=True)
                if method=='umap':
                    xy=UMAP(n_neighbors=setting,min_dist=.15,metric='cosine',random_state=seed,n_jobs=1).fit_transform(vectors)
                else:
                    xy=TSNE(perplexity=setting,metric='cosine',init='pca',learning_rate='auto',random_state=seed,max_iter=1000).fit_transform(vectors)
                projected=pairwise_distances(xy)
                np.fill_diagonal(projected,np.inf)
                neighbors2=np.argsort(projected,axis=1)[:,:15]
                recall=float(np.mean([len(set(a)&set(b))/15 for a,b in zip(original,neighbors2)]))
                knns[name]=neighbors2
                # Fixed sample for tractable, comparable trustworthiness diagnostics.
                sample=np.random.default_rng(7).choice(len(rows),min(1000,len(rows)),replace=False)
                trust=float(trustworthiness(vectors[sample],xy[sample],n_neighbors=15,metric='cosine'))
                projections[name]=xy.round(5).tolist()
                metrics.append({'projection':name,'neighbor_recall_at_15':recall,'trustworthiness_sample_1000':trust})
                save(f'{key}-projections.json',projections)
                save(f'{key}-metrics.json',metrics)
    stability=[]
    for method in ['umap','tsne']:
        for setting in ([15,40] if method=='umap' else [30,50]):
            a=knns[f'{method}-{setting}-17'];b=knns[f'{method}-{setting}-42']
            stability.append({'method':method,'setting':setting,'seed_neighbor_overlap_at_15':float(np.mean([len(set(x)&set(y))/15 for x,y in zip(a,b)]))})
    save(f'{key}-stability.json',stability)

if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--model',choices=[*MODELS,'all','audit'],default='audit')
    args=parser.parse_args()
    rows,audit=corpus()
    print(json.dumps({k:v for k,v in audit.items() if k!='duplicate_ids'},ensure_ascii=True),flush=True)
    if args.model!='audit':
        for key in MODELS if args.model=='all' else [args.model]:
            evaluate(key,rows,encode(key,rows))
