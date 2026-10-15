import {compareOfficialism,filterBallots,annualSeries,personAnnualSeries,blockKey,expandVoteTypes} from './votes-model.mjs?v=20261015-gestiones';
import {mountTypeFilter,checkedValues} from './checkbox-filter.mjs?v=20261015-gestiones';
import {personAutocomplete} from './person-autocomplete.mjs?v=20261015-gestiones';
import {chartPng} from './chart-image.mjs?v=20261015-gestiones';
import {categories,normalize} from './model.mjs';
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>new Intl.NumberFormat('es-AR').format(n);
const percent=n=>n===null?'Sin votos':new Intl.NumberFormat('es-AR',{style:'percent',maximumFractionDigits:1}).format(n);
const voteTypes=[{id:'ley',label:'Proyectos de Ley'},{id:'informes',label:'Pedidos de informes'},{id:'declaracion',label:'Declaraciones'},{id:'otros',label:'Otros'}];
let data,loading=false,page=0,currentIds,personId='',autocomplete,chartSeries=[],imagePromise=null,resizeTimer;
const size=20;
const measure=()=>$('#votes-measure input:checked').value;
const measureName=()=>measure()==='contested'?'Con disidencias':'Coincidencia general';
export async function renderVotes(monitor){
  if(monitor)currentIds=new Set(monitor.legisladores.filter(p=>p.activo).map(p=>p.id));
  if(data){render();return;}
  if(loading)return;
  loading=true;$('#votes-state').hidden=false;$('#votes-state').textContent='Consultando la base de votaciones…';
  try{
    const response=await fetch('data/votaciones.json',{cache:'no-cache'});
    if(!response.ok)throw new Error('No se pudo leer la base');data=await response.json();
    const years=[...new Set(data.votaciones.map(v=>v.fecha.slice(0,4)))].sort().reverse();
    $('#votes-year').innerHTML=`<option value="all">${years.at(-1)} - actualidad</option>`+years.map(y=>`<option>${y}</option>`).join('');
    autocomplete=personAutocomplete($('#votes-person'),$('#votes-person-options'),Object.entries(data.legisladores).map(([id,name])=>({id,name})).sort((a,b)=>a.name.localeCompare(b.name,'es')),id=>{personId=id;$('#votes-person-clear').hidden=!id;render();});
    $('#votes-person-clear').addEventListener('click',()=>autocomplete.clear());
    ['#votes-year','#votes-active','#votes-grouped'].forEach(id=>$(id).addEventListener('change',()=>{page=0;render();}));
    $('#votes-measure').addEventListener('change',render);
    mountTypeFilter('#votes-types',()=>{page=0;render();},{choices:voteTypes});
    $('#votes-list-scope').addEventListener('change',()=>{page=0;renderList();});
    $('#votes-search').addEventListener('input',()=>{page=0;renderList();});
    $('#votes-reset').addEventListener('click',()=>{
      $('#votes-year').value='all';$('#votes-active').checked=false;$('#votes-grouped').checked=true;
      $('#votes-types').querySelectorAll('input').forEach(input=>input.checked=true);
      $('#votes-list-scope').value='all';$('#votes-search').value='';$('#votes-measure input[value="general"]').checked=true;page=0;autocomplete.clear();
    });
    $('#votes-download').addEventListener('click',()=>exportImage(false));
    $('#votes-copy').addEventListener('click',()=>exportImage(true));
    window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(!$('#view-votaciones').hidden)drawTrend(chartSeries);},150);});
    $('#votes-controls').hidden=false;$('#votes-content').hidden=false;$('#votes-state').hidden=true;render();
  }catch(error){
    data=null;$('#votes-state').hidden=false;
    $('#votes-state').innerHTML='No se pudo cargar la base de votos. <button type="button" id="votes-retry">Reintentar</button>';
    $('#votes-retry').addEventListener('click',()=>renderVotes());
  }finally{loading=false;}
}
function filters(){return {year:$('#votes-year').value,types:expandVoteTypes(checkedValues('#votes-types')),
  reference:['119','86','83','7'],grouped:$('#votes-grouped').checked,
  activeIds:$('#votes-active').checked?currentIds:null};}
function color(id){
  const members=data.trayectorias?.[id]?.bloques||[id];
  if(members.some(x=>['83','86','119','120','123'].includes(x)))return '#c38c0e';
  if(members.some(x=>['108','118','124','41','87'].includes(x)))return '#2488b4';
  if(members.some(x=>['104','125'].includes(x)))return '#d56947';
  if(members.some(x=>['114','115','117','121','122','127'].includes(x)))return '#a65aa0';
  if(members.some(x=>['107','113','112','116','51'].includes(x)))return '#c73323';
  return '#65796c';
}
function render(){
  const f=filters(),comparison=compareOfficialism(data,f),result=measure()==='contested'?comparison.contested:comparison.general;
  const annual=annualSeries(data,{...f,contested:measure()==='contested'});
  const defaults=new Set(['119','124','104','114','107','9'].map(id=>blockKey(data,id,true)));
  // Include historical aliases of the main blocs when name unification is off.
  chartSeries=annual.series.filter(s=>defaults.has(s.id)||defaults.has(blockKey(data,s.id,true)));
  if(personId)chartSeries.push(personAnnualSeries(data,personId,{...f,contested:measure()==='contested'}));
  $('#votes-denominator').textContent=`${measureName()}: ${fmt(result.eligible)} votaciones comparables de ${fmt(result.ballots)} seleccionadas. ${fmt(result.withoutReference)} excluidas por empate o falta de referencia y ${fmt(result.inconsistent)} por inconsistencias. “No votó” entra en el denominador individual.`;
  const first=data.cobertura_anual?.find(y=>y.primera)?.primera||data.desde;
  $('#votes-history-note').textContent=`Toda la serie se calcula con nuestro scrapeo de votos oficiales, sin empalmar porcentajes precalculados. Primera votación recuperada: ${first}. ${first.slice(0,4)} y ${data.hasta.slice(0,4)} tienen cobertura parcial. Los filtros se aplican a todo el histórico. ${fmt(data.resumen.votaciones)} votaciones y ${fmt(data.resumen.votos)} registros individuales; consulta del ${new Date(data.actualizado).toLocaleDateString('es-AR')}.`;
  $('#votes-subtitle').textContent='Promedio de las tasas individuales de coincidencia con el PRO. Ordenado por coincidencia general; ambas medidas usan los mismos filtros.';
  $('#votes-ranking').innerHTML=comparison.rows.length?comparison.rows.map(g=>`<div class="vote-rank"><h4>${esc(g.name)}</h4>${rankMeasure(g,'General')}${rankMeasure(g.contested,'Con disidencias')}</div>`).join(''):'<p class="empty">No hay votos comparables con estos filtros.</p>';
  $('#votes-quality').textContent=`Se conservan ${fmt(data.resumen.sin_bloque_historico)} registros sin bloque histórico identificado. ${fmt(data.resumen.totales_inconsistentes)} votaciones inconsistentes se excluyen del indicador. “Otros” reúne otras resoluciones, otros asuntos y registros sin categoría. Una votación con varios tipos seleccionados se cuenta una sola vez.`;
  drawTrend(chartSeries);renderContinuities();renderList();
}
function pointDetail(p){return p.blocks?`${fmt(p.matches)} coincidencias de ${fmt(p.total)} registros · ${p.blocks.join(' / ')}`:`${fmt(p.people)} ${p.people===1?'legislador':'legisladores'} · ${fmt(p.total)} registros`;}
function drawTrend(series){
  imagePromise=null;$('#votes-image-status').textContent='';
  const root=d3.select('#votes-trend');root.selectAll('*').remove();
  const selected=series.filter(s=>s.points.length);
  $('#votes-copy').disabled=$('#votes-download').disabled=!selected.length;
  renderAccessibleTable(selected);
  if(!selected.length){root.append('p').attr('class','empty').text('Sin votos comparables con los filtros seleccionados. Probá otro año o tipo, o desactivá “Solo legisladores actuales”.');return;}
  const years=selected.flatMap(s=>s.points.map(p=>p.year)),min=$('#votes-year').value==='all'?2015:Math.min(...years),max=Math.max(...years);
  const w=Math.max(680,$('#votes-trend').clientWidth),h=640,m={top:64,right:230,bottom:52,left:52};
  const x=d3.scaleLinear().domain(min===max?[min-.5,max+.5]:[min,max]).range([m.left,w-m.right]);
  const y=d3.scaleLinear().domain([0,1]).range([h-m.bottom,m.top]);
  const svg=root.append('svg').attr('viewBox',`0 0 ${w} ${h}`).attr('role','img').attr('aria-label',`${measureName()}: evolución anual de coincidencia con el PRO, de cero a cien por ciento. Datos disponibles en la tabla accesible.`);
  svg.append('title').text(`${measureName()} · El oficialómetro`);
  svg.append('g').attr('class','chart-grid').attr('transform',`translate(${m.left},0)`).call(d3.axisLeft(y).tickValues([0,.25,.5,.75,1]).tickSize(-(w-m.right-m.left)).tickFormat(v=>percent(v)));
  svg.append('g').attr('class','vote-year-axis').attr('transform',`translate(0,${h-m.bottom})`).call(d3.axisBottom(x).tickValues(d3.range(min,max+1)).tickFormat(d3.format('d')));
  for(const year of [2019,2023])if(year>=min&&year<=max){
    const marker=svg.append('g').attr('class','vote-government');
    marker.append('line').attr('x1',x(year)).attr('x2',x(year)).attr('y1',m.top-8).attr('y2',h-m.bottom).attr('stroke','#9aa29c').attr('stroke-dasharray','4 5');
  }
  for(const period of [{start:2015,end:2019,label:'Larreta I'},{start:2019,end:2023,label:'Larreta II'},{start:2023,end:Infinity,label:'J. Macri I'}]){
    if(period.end<=min||period.start>max)continue;
    const center=(Math.max(min,period.start)+Math.min(max,period.end))/2;
    svg.append('g').attr('class','vote-government').append('text').attr('x',x(center)).attr('y',m.top-22).attr('text-anchor','middle').attr('fill','#64716a').text(period.label);
  }
  const endpoints=[],groups=new Map(),labels=new Map();
  for(const s of selected){
    const c=s.kind==='person'?'#263c35':color(s.id),individual=s.kind==='person';
    const g=svg.append('g').attr('class','vote-line-group').style('pointer-events','none').attr('data-series',s.id).attr('tabindex',0).attr('role','group').attr('aria-label',s.name);groups.set(s.id,g);
    g.append('title').text(`${s.name}: ${s.points.map(p=>`${p.year} ${percent(p.rate)}`).join('; ')}`);
    for(let i=1;i<s.points.length;i++){
      const a=s.points[i-1],b=s.points[i];if(b.year-a.year!==1)continue;
      g.append('line').attr('x1',x(a.year)).attr('y1',y(a.rate)).attr('x2',x(b.year)).attr('y2',y(b.rate)).attr('stroke',c).attr('stroke-width',individual?3:2.5).attr('stroke-dasharray',individual?'7 4':null);
    }
    g.selectAll('circle').data(s.points).join('circle').attr('cx',p=>x(p.year)).attr('cy',p=>y(p.rate)).attr('r',individual?5:4).attr('stroke',c).attr('stroke-width',1.5).attr('fill',c).append('title').text(p=>`${s.name} · ${p.year}: ${percent(p.rate)} · ${pointDetail(p)}`);
    const last=s.points.at(-1);endpoints.push({s,last,natural:y(last.rate),label:y(last.rate),c});
  }
  endpoints.sort((a,b)=>a.label-b.label);
  for(let i=1;i<endpoints.length;i++)endpoints[i].label=Math.max(endpoints[i].label,endpoints[i-1].label+38);
  if(endpoints.at(-1).label>h-m.bottom-12){const excess=endpoints.at(-1).label-(h-m.bottom-12);endpoints.forEach(p=>p.label-=excess);}
  for(const p of endpoints){
    const g=svg.append('g').attr('class','vote-endpoint').attr('data-series',p.s.id);labels.set(p.s.id,g);
    g.append('path').attr('d',`M${x(p.last.year)+6},${p.natural}L${w-m.right+10},${p.label}H${w-m.right+18}`).attr('stroke',p.c).attr('fill','none').attr('stroke-opacity',.7);
    const text=g.append('text').attr('x',w-m.right+24).attr('y',p.label-3).attr('fill','#263c35').attr('class','vote-series-label');
    text.append('tspan').text(p.s.name.length>28?p.s.name.slice(0,26)+'…':p.s.name);
    text.append('tspan').attr('x',w-m.right+24).attr('dy',18).attr('font-weight','700').text(percent(p.last.rate));text.append('title').text(p.s.name);
  }
  let hoveredId=null;
  const focus=id=>{for(const [key,g] of groups)g.style('opacity',!id||key===id?1:.18);for(const [key,g] of labels)g.style('opacity',!id||key===id?1:.3);if(id)groups.get(id)?.raise();};
  for(const [id,g] of groups)g.on('focus',()=>focus(id)).on('blur',()=>focus(hoveredId));
  for(const [id,g] of labels)g.on('pointerenter',()=>focus(id)).on('pointerleave',()=>focus(null));
  const points=selected.flatMap(s=>s.points.map(p=>({...p,id:s.id,name:s.name,color:s.kind==='person'?'#263c35':color(s.id)})));
  const nearest=d3.Delaunay.from(points,p=>x(p.year),p=>y(p.rate));
  const highlight=svg.append('circle').style('pointer-events','none').attr('data-export-ignore','').attr('r',7).attr('fill','none').attr('stroke-width',2).attr('opacity',0);
  const tip=root.append('div').attr('class','votes-chart-tooltip').attr('aria-hidden','true');
  svg.append('rect').attr('data-export-ignore','').attr('x',m.left).attr('y',m.top).attr('width',w-m.right-m.left).attr('height',h-m.top-m.bottom).attr('fill','transparent')
    .on('pointermove',event=>{
      const [px,py]=d3.pointer(event,svg.node()),p=points[nearest.find(px,py)];hoveredId=p.id;focus(p.id);
      highlight.raise().attr('cx',x(p.year)).attr('cy',y(p.rate)).attr('stroke',p.color).attr('opacity',1);
      const box=highlight.node().getBoundingClientRect();tip.text(`${measureName()} · ${p.name} · ${p.year}: ${percent(p.rate)} · ${pointDetail(p)}`).style('left',`${Math.min(window.innerWidth-160,Math.max(160,box.x+box.width/2))}px`).style('top',`${box.y-12}px`).style('opacity',1);
    }).on('pointerleave',()=>{tip.style('opacity',0);highlight.attr('opacity',0);hoveredId=null;focus(null);});
}
function renderAccessibleTable(series){
  $('#votes-years').innerHTML=`<table><caption>${esc(measureName())} · datos del gráfico</caption><thead><tr><th>Bloque o persona</th><th>Año</th><th>Coincidencia</th><th>Registros</th></tr></thead><tbody>${series.flatMap(s=>s.points.map(p=>`<tr><th scope="row">${esc(s.name)}</th><td>${p.year}</td><td>${percent(p.rate)}</td><td>${fmt(p.total)}</td></tr>`)).join('')}</tbody></table>`;
}
function pngForChart(){
  if(!imagePromise){
    const context=[$('#votes-year').selectedOptions[0].textContent,checkedValues('#votes-types').map(id=>voteTypes.find(t=>t.id===id).label).join(', '),$('#votes-active').checked?'Solo legisladores actuales':'Todos los legisladores',personId?data.legisladores[personId]:null].filter(Boolean).join(' · ');
    imagePromise=chartPng($('#votes-trend svg'),{title:`El oficialómetro · ${measureName()}`,subtitle:context,footer:'LegisCABA · Fuente: Legislatura CABA · Idea original: Andy Tow · visualizando.github.io/legisCABA'}).catch(error=>{imagePromise=null;throw error;});
  }return imagePromise;
}
async function exportImage(copy){
  const button=$(copy?'#votes-copy':'#votes-download');button.disabled=true;$('#votes-image-status').textContent='Generando PNG…';
  try{
    if(copy){
      if(!navigator.clipboard?.write||!window.ClipboardItem)throw new Error('clipboard');
      await navigator.clipboard.write([new ClipboardItem({'image/png':pngForChart()})]);
      $('#votes-image-status').textContent='Imagen copiada al portapapeles.';
    }else{
      const blob=await pngForChart(),url=URL.createObjectURL(blob),link=document.createElement('a');
      link.href=url;link.download=`oficialometro-${measure()}-${$('#votes-year').value}.png`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
      $('#votes-image-status').textContent='Imagen PNG descargada.';
    }
  }catch(error){$('#votes-image-status').textContent=copy?'No se pudo copiar la imagen. Usá “Bajar imagen”.':'No se pudo generar la imagen. Volvé a intentarlo.';}finally{button.disabled=false;}
}
function rankMeasure(row,label){
  return `<div class="vote-measure"><div class="vote-rank-label"><span>${label}</span><strong>${row?percent(row.rate):'Sin votos comparables'}</strong></div><div class="vote-track" aria-hidden="true">${row?`<i style="width:${row.rate*100}%;background:${color(row.id)}"></i>`:''}</div><p>${row?`${fmt(row.people)} ${row.people===1?'legislador':'legisladores'} · ${fmt(row.ballots)} votaciones · ${fmt(row.total)} registros · ${fmt(row.nonvotes)} “no votó”`:'Sin registros para calcular esta medida con los filtros seleccionados.'}</p></div>`;
}
function renderContinuities(){
  $('#votes-continuities').innerHTML=`<p>Se unifican movimientos simultáneos de al menos dos legisladores cuando representan al menos el 80% de quienes continuaban en el bloque de origen y de quienes continuaban en el de destino. Se cuentan solo personas con bloque identificado antes y después. Las escisiones y las fusiones sin esa continuidad permanecen separadas. Se conservan los nombres originales en cada voto.</p><div class="table-scroll"><table><thead><tr><th>Origen</th><th>Continuidad</th><th>Fecha</th><th>Movimiento</th><th>Tratamiento</th></tr></thead><tbody>${(data.continuidades||[]).map(c=>`<tr><td>${esc(c.nombre_origen||data.bloques[c.desde]||c.desde)}</td><td>${esc(c.nombre_destino||data.bloques[c.hacia]||c.hacia)}</td><td>${c.fecha}</td><td>${c.legisladores.length}/${c.continuaban_origen} en origen · ${c.legisladores.length}/${c.continuaban_destino} en destino</td><td>${c.unificados?'Unificados':'Separados'}</td></tr>`).join('')}</tbody></table></div>`;
}
function renderList(){
  const f=filters(),term=normalize($('#votes-search').value);
  const contested=$('#votes-list-scope').value==='contested';
  const rows=filterBallots(data,{...f,contested}).filter(b=>(!f.activeIds||b.votos.some(v=>f.activeIds.has(v.legislador)))&&normalize(`${b.asunto} ${b.fecha} ${(b.proyectos||[]).map(p=>p.numero+' '+p.sumario).join(' ')}`).includes(term)).sort((a,b)=>b.fecha.localeCompare(a.fecha)||Number(b.id)-Number(a.id));
  page=Math.min(page,Math.max(0,Math.ceil(rows.length/size)-1));
  $('#votes-list').innerHTML=`<div class="project-toolbar"><p>${fmt(rows.length)} ${rows.length===1?'votación':'votaciones'} nominales · ${contested?'con disidencias':'todas las seleccionadas'}${f.activeIds?' · detalle limitado al padrón actual':''}</p><div class="pagination"><button id="votes-prev" type="button" ${page===0?'disabled':''} aria-label="Votaciones anteriores">←</button><span>${page+1} / ${Math.max(1,Math.ceil(rows.length/size))}</span><button id="votes-next" type="button" ${(page+1)*size>=rows.length?'disabled':''} aria-label="Votaciones siguientes">→</button></div></div>`+rows.slice(page*size,(page+1)*size).map(b=>`<details class="vote-detail"><summary><span>${esc(b.fecha)} · ${esc(b.asunto)}</span><small>${b.positivos} afirmativos · ${b.negativos} negativos · ${b.abstenciones} ${b.abstenciones===1?'abstención':'abstenciones'} · ${(b.categorias||[]).map(c=>esc(categories.find(x=>x.id===c)?.short||c)).join(' / ')||'Sin categoría'}</small></summary>${(b.proyectos||[]).map(p=>`<p>${esc(p.numero)} · ${esc(p.tipo)} · ${esc(p.sumario)}</p>`).join('')}<p><a href="https://parlamentaria.legislatura.gob.ar/pages/sesion_votaciones.aspx?IdSesion=${encodeURIComponent(b.sesion)}" target="_blank" rel="noopener">Ver sesión oficial ↗</a> · Votación ${esc(b.id)}</p><div class="table-scroll"><table><thead><tr><th scope="col">Legislador/a</th><th scope="col">Bloque en la fecha</th><th scope="col">Voto</th><th scope="col">Presencia informada</th></tr></thead><tbody>${b.votos.filter(v=>!f.activeIds||f.activeIds.has(v.legislador)).map(v=>`<tr><td>${esc(data.legisladores[v.legislador])}</td><td>${esc(data.bloques[v.bloque]||'Sin bloque histórico identificado')}</td><td>${esc(v.voto)}</td><td>${esc(v.presencia)}</td></tr>`).join('')}</tbody></table></div></details>`).join('');
  $('#votes-prev').onclick=()=>{page--;renderList();};$('#votes-next').onclick=()=>{page++;renderList();};
}
