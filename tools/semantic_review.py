"""Package pilot outputs as a standalone, offline review document."""
import json
from pathlib import Path
from semantic_pilot import OUT, MODELS

def load(name):
    return json.loads((OUT/name).read_text(encoding='utf-8'))

payload={'rows':load('corpus.json'),'audit':load('audit.json'),'models':{}}
for key in MODELS:
    payload['models'][key]={s:load(f'{key}-{s}.json') for s in ['neighbors','projections','metrics','stability','embedding']}

html='''<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>LegisCABA · Prueba de similitud temática</title>
<style>
:root{font-family:Arial,Helvetica,sans-serif;color:#202726;background:#f7f6f2;font-variant-numeric:tabular-nums}*{box-sizing:border-box}body{max-width:1280px;margin:auto;padding:28px}h1,h2{font-family:Georgia,serif;font-weight:400}h1{font-size:38px;margin:12px 0}h2{font-size:24px}p{line-height:1.55}header{border-bottom:1px solid #d8dcd6;margin-bottom:24px}.note,small{color:#596461;font-size:13px}.controls{display:flex;gap:16px;flex-wrap:wrap;margin:18px 0}label{display:grid;gap:6px;font-size:13px}input,select,button{font:inherit;padding:9px;min-height:44px;border:1px solid #a7afaa;border-radius:3px;background:white;color:inherit;max-width:100%}input[type=checkbox]{min-height:18px}button{cursor:pointer;text-align:left}button:hover{background:#f4e4df}:focus-visible{outline:3px solid #144f9b;outline-offset:2px}.maps{display:grid;grid-template-columns:1fr 1fr;gap:24px}.panel{background:white;border:1px solid #d8dcd6;padding:16px;min-width:0}svg{width:100%;display:block;aspect-ratio:1.2}circle{fill:#727a77;opacity:.45}circle.neighbor{fill:#245d78;opacity:1}circle.selected{fill:#b43e2c;opacity:1;stroke:white;stroke-width:1.5}circle.flagged{fill:none;stroke:#727a77;opacity:.6}#detail{margin-top:24px}.neighbors{display:grid;grid-template-columns:1fr 1fr;gap:24px}.neighbors ol{padding-left:24px}.neighbors li{margin-bottom:10px}.neighbors button{width:100%;font-size:13px;line-height:1.5}table{border-collapse:collapse;font-size:13px;width:100%}td,th{text-align:left;padding:9px;border-bottom:1px solid #d8dcd6}#results{max-height:240px;overflow:auto;display:grid;gap:4px}#results:empty{display:none}.badge{color:#b43e2c}summary{cursor:pointer;padding:14px 0}a{color:inherit;text-underline-offset:3px}@media(max-width:650px){body{padding:16px}h1{font-size:30px}.maps,.neighbors{grid-template-columns:1fr}table{font-size:11px}td,th{padding:6px}.panel{padding:10px}}
</style>
<header><small>LEGISCABA / LABORATORIO LOCAL / NO PUBLICADO</small><h1>¿Qué proyectos hablan de temas parecidos?</h1>
<p>Prueba sobre <strong id="count"></strong> proyectos de ley. Cada punto representa un expediente y las posiciones se calculan solo a partir de su sumario.</p>
<p class="note">La cercanía visual es aproximada. No mide acuerdo político, calidad ni impacto. Los vecinos de las listas se calculan en el espacio semántico original. Los círculos vacíos marcan referencias legales potencialmente insuficientes.</p></header>
<p id="audit"></p><p class="note">El universo incluye proyectos con autorías externas al padrón de legisladores. La autoría figura en cada ficha; no se atribuyen esos expedientes a un legislador.</p>
<div class="controls"><label>Modelo<select id="model"><option value="minilm">MiniLM multilingüe</option><option value="e5">E5 multilingüe small</option></select></label>
<label>Semilla<select id="seed"><option>17</option><option>42</option></select></label>
<label>Vecinos UMAP<select id="umap"><option>15</option><option>40</option></select></label>
<label>Perplejidad t-SNE<select id="tsne"><option>30</option><option>50</option></select></label>
<label>Vecinos de las listas<select id="mode"><option value="distinct">Excluir sumarios iguales al seleccionado</option><option value="all">Todos</option><option value="unshared">Excluir iguales al seleccionado y firmas compartidas</option></select></label></div>
<label>Buscar un proyecto por número o sumario<input id="search" placeholder="Por ejemplo: dengue, vivienda, 662-D-2024" type="search"></label><div id="results"></div>
<div class="maps"><section class="panel"><h2>UMAP</h2><p id="umap-stat" class="note"></p><svg id="umap-map" viewBox="0 0 600 500" role="img" aria-label="Proyección UMAP. Buscar un proyecto para examinar sus vecinos."></svg></section>
<section class="panel"><h2>t-SNE</h2><p id="tsne-stat" class="note"></p><svg id="tsne-map" viewBox="0 0 600 500" role="img" aria-label="Proyección t-SNE. Buscar un proyecto para examinar sus vecinos."></svg></section></div>
<section class="panel" id="detail" aria-live="polite"></section>
<details><summary>Comparación cuantitativa de las 16 proyecciones</summary><p class="note">Recuperación: proporción de los 15 vecinos semánticos que también aparecen entre los 15 vecinos del mapa, calculada sobre todos los proyectos. Trustworthiness: penaliza falsos vecinos sobre una muestra fija de 1.000 proyectos. Ambas medidas incluyen sumarios repetidos y no validan la pertinencia temática. No comparan la calidad de los modelos.</p><div style="overflow:auto"><table><thead><tr><th>Modelo / proyección</th><th>Recuperación @15</th><th>Trustworthiness</th></tr></thead><tbody id="metrics"></tbody></table></div><div id="stability"></div></details>
<footer><p class="note">Fuente: site/data/monitor.json · <span id="dates"></span>. Limpieza conservadora: espacios, mayúsculas y puntuación final. Se preservan acciones, negaciones, entidades y números de ley. No hay clasificación temática automática publicada ni evaluación de posiciones políticas.</p><p class="note">Modelos: <a href="https://huggingface.co/sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2">MiniLM</a> · <a href="https://huggingface.co/intfloat/multilingual-e5-small">E5 small</a>.</p></footer>
<script type="application/json" id="data">PAYLOAD</script><script>
const data=JSON.parse(document.getElementById('data').textContent),$=id=>document.getElementById(id),NS='http://www.w3.org/2000/svg';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pct=v=>(100*v).toFixed(1)+'%';let selected=data.rows.findIndex(p=>p.sumario.toLowerCase().includes('vacunación contra el dengue'));if(selected<0)selected=0;
$('count').textContent=data.audit.laws.toLocaleString('es-AR');$('audit').textContent=`${data.audit.projects_in_duplicate_groups} expedientes en ${data.audit.duplicate_groups} grupos de sumarios iguales normalizados; ${data.audit.flagged} referencias legales potencialmente poco informativas (heurística, sin excluir).`;
$('dates').textContent=data.audit.first_date+' a '+data.audit.last_date;
function draw(method){const model=data.models[$('model').value],name=method+'-'+$(method).value+'-'+$('seed').value,xy=model.projections[name],svg=$(method+'-map');svg.replaceChildren();const xs=xy.map(p=>p[0]),ys=xy.map(p=>p[1]),xmin=Math.min(...xs),xmax=Math.max(...xs),ymin=Math.min(...ys),ymax=Math.max(...ys),scale=Math.min(560/(xmax-xmin||1),460/(ymax-ymin||1));const near=new Set(model.neighbors[selected][$('mode').value].map(p=>p.index));
xy.forEach((p,i)=>{const c=document.createElementNS(NS,'circle');c.setAttribute('cx',300+(p[0]-(xmax+xmin)/2)*scale);c.setAttribute('cy',250+(p[1]-(ymax+ymin)/2)*scale);c.setAttribute('r',i===selected?5:near.has(i)?3.5:2);c.setAttribute('class',i===selected?'selected':near.has(i)?'neighbor':data.rows[i].flags.length?'flagged':'');svg.append(c)});
// Paint the selected point last so overlapping neighbors cannot cover it.
svg.append(svg.querySelector('.selected'));
// A single hit layer finds the closest point; keyboard access is provided by search/list.
svg.onclick=ev=>{const r=svg.getBoundingClientRect(),x=(ev.clientX-r.left)*600/r.width,y=(ev.clientY-r.top)*500/r.height;let best=Infinity,index=0;xy.forEach((p,i)=>{const cx=300+(p[0]-(xmax+xmin)/2)*scale,cy=250+(p[1]-(ymax+ymin)/2)*scale,d=(x-cx)**2+(y-cy)**2;if(d<best){best=d;index=i}});select(index)};
const m=model.metrics.find(m=>m.projection===name);$(method+'-stat').textContent=`Recupera ${pct(m.neighbor_recall_at_15)} de los 15 vecinos semánticos · semilla ${$('seed').value}`;}
function select(i){selected=i;render()}
function render(){draw('umap');draw('tsne');const p=data.rows[selected];$('detail').innerHTML=`<p class="note">PROYECTO SELECCIONADO · rojo en ambos mapas; vecinos del modelo activo en azul</p><h2>${esc(p.sumario)}</h2><p><a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.numero)} ↗</a> · ${esc(p.fecha)} · ${esc(p.autor.nombre)}</p><p class="badge">${esc(p.flags.join(' · '))}${p.duplicate_group?' · Tiene sumarios iguales normalizados':''}</p><div class="neighbors">${Object.entries(data.models).map(([key,m])=>`<section><h3>${key==='e5'?'E5 small':'MiniLM'} · diez vecinos semánticos</h3><ol>${m.neighbors[selected][$('mode').value].map(n=>{const q=data.rows[n.index];return `<li><button data-index="${n.index}">${esc(q.numero)} · ${esc(q.sumario)}<br><small>Coseno ${n.cosine.toFixed(3)} · ${esc(q.autor.nombre)}${q.flags.length?' · REVISAR REFERENCIA LEGAL':''}</small></button></li>`}).join('')}</ol></section>`).join('')}</div>`;$('detail').querySelectorAll('button').forEach(b=>b.onclick=()=>select(Number(b.dataset.index)))}
$('search').oninput=()=>{const q=$('search').value.toLowerCase().trim();$('results').replaceChildren();if(!q)return;data.rows.map((p,i)=>({p,i})).filter(({p})=>(p.numero+' '+p.sumario).toLowerCase().includes(q)).slice(0,40).forEach(({p,i})=>{const b=document.createElement('button');b.textContent=p.numero+' · '+p.sumario;b.onclick=()=>select(i);$('results').append(b)})};
['model','seed','umap','tsne','mode'].forEach(id=>$(id).onchange=render);
$('metrics').innerHTML=Object.entries(data.models).flatMap(([key,m])=>m.metrics.map(v=>`<tr><td>${key} / ${v.projection}</td><td>${pct(v.neighbor_recall_at_15)}</td><td>${v.trustworthiness_sample_1000.toFixed(3)}</td></tr>`)).join('');
$('stability').innerHTML='<h3>Estabilidad entre semillas</h3>'+Object.entries(data.models).map(([key,m])=>'<p class="note">'+key+': '+m.stability.map(s=>`${s.method} ${s.setting}: ${pct(s.seed_neighbor_overlap_at_15)}`).join(' · ')+'</p>').join('');render();
</script></html>'''
(OUT/'review.html').write_text(html.replace('PAYLOAD',json.dumps(payload,ensure_ascii=False).replace('<','\\u003c')),encoding='utf-8')
numbers=['2885-D-2023','2832-D-2023','2790-D-2023','2791-D-2023','612-D-2024','2940-D-2023','240-D-2024','662-D-2024','2813-D-2023','2945-D-2023']
lines=['# Diez casos de inspección semántica','',
       'Selección deliberada de casos diversos y problemáticos; no es una muestra aleatoria ni un benchmark independiente. Se excluyen sumarios iguales al seleccionado; pueden persistir repeticiones entre los vecinos.','']
for number in numbers:
    i=next(i for i,p in enumerate(payload['rows']) if p['numero']==number)
    p=payload['rows'][i]
    lines += [f"## {number}",'',p['sumario'],'']
    for key,m in payload['models'].items():
        lines += [f'### {key}','']
        for neighbor in m['neighbors'][i]['distinct'][:5]:
            q=payload['rows'][neighbor['index']]
            lines += [f"- [{q['numero']}]({q['url']}): {q['sumario']} (coseno {neighbor['cosine']:.3f})."]
        lines += ['']
(OUT/'cases.md').write_text('\n'.join(lines),encoding='utf-8')
print(OUT/'review.html')
