"""Download public model files with bounded HTTP timeouts (no corpus upload)."""
import hashlib
import json
from pathlib import Path
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from semantic_pilot import ROOT, MODELS

for key,model in MODELS.items():
    base='https://huggingface.co/'
    with urllib.request.urlopen(base+'api/models/'+model,timeout=30) as r:
        info=json.load(r)
    revision=info['sha']
    target=ROOT/'.local'/'semantic-models'/key
    target.mkdir(parents=True,exist_ok=True)
    manifest={'model':model,'revision':revision,'files':{}}
    for item in info['siblings']:
        name=item['rfilename']
        if not (name.endswith('.json') or name in ['model.safetensors','sentencepiece.bpe.model','tokenizer.model']): continue
        if '/' in name and not name.startswith('1_Pooling/'):continue
        path=target/name
        if not path.exists():
            path.parent.mkdir(parents=True,exist_ok=True)
            print('Downloading',key,name,flush=True)
            url=base+model+'/resolve/'+revision+'/'+name+'?pilot=1'
            if name=='model.safetensors':
                print('Probe range',flush=True)
                with urllib.request.urlopen(urllib.request.Request(url+'&part=probe',headers={'Range':'bytes=0-0'}),timeout=30) as response:
                    total=int(response.headers['Content-Range'].split('/')[-1])
                    assert response.status==206 and response.headers['Content-Range']==f'bytes 0-0/{total}'
                    assert len(response.read(2))==1
                print('Size',total,flush=True)
                chunk_size=4*1024*1024
                parts=target/'parts'
                parts.mkdir(exist_ok=True)
                def fetch(start):
                    end=min(start+chunk_size,total)-1
                    dest=parts/str(start)
                    if dest.exists() and dest.stat().st_size==end-start+1:return dest
                    for attempt in range(3):
                        try:
                            request=urllib.request.Request(url+f'&part={start}',headers={'Range':f'bytes={start}-{end}'})
                            with urllib.request.urlopen(request,timeout=45) as response:
                                assert response.status==206
                                assert response.headers['Content-Range']==f'bytes {start}-{end}/{total}'
                                content=response.read()
                            assert len(content)==end-start+1
                            dest.write_bytes(content)
                            if start%(chunk_size*12)==0:print('Part ready',key,start,flush=True)
                            return dest
                        except Exception:
                            if attempt==2:raise
                with ThreadPoolExecutor(max_workers=12) as pool:
                    files=list(pool.map(fetch,range(0,total,chunk_size)))
                with path.with_suffix(path.suffix+'.tmp').open('wb') as out:
                    for f in files:out.write(f.read_bytes())
                assert path.with_suffix(path.suffix+'.tmp').stat().st_size==total
                for f in files:f.unlink()
                parts.rmdir()
            else:
                with urllib.request.urlopen(url,timeout=45) as response,path.with_suffix(path.suffix+'.tmp').open('wb') as out:
                    while chunk:=response.read(1024*1024):out.write(chunk)
            path.with_suffix(path.suffix+'.tmp').replace(path)
        manifest['files'][name]=hashlib.sha256(path.read_bytes()).hexdigest()
    (target/'download-manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
    print('Ready',key,revision,flush=True)
