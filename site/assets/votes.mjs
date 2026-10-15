import {compareOfficialism,filterBallots,annualSeries,blockKey} from './votes-model.mjs?v=20261015-comparacion';
import {mountTypeFilter,checkedValues} from './checkbox-filter.mjs?v=20261015-comparacion';
import {categories,normalize} from './model.mjs';
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>new Intl.NumberFormat('es-AR').format(n);
const percent=n=>n===null?'Sin votos':new Intl.NumberFormat('es-AR',{style:'percent',maximumFractionDigits:1}).format(n);
let data,loading=false,page=0,currentIds,selectedSeries=null;
const size=20;
export async function renderVotes(monitor){
  if(monitor)currentIds=new Set(monitor.legisladores.filter(p=>p.activo).map(p=>p.id));
  if(data){render();return;}
  if(loading)return;
  loading=true;$('#votes-state').textContent='Consultando la base de votaciones…';
  try{
    const response=await fetch('data/votaciones.json',{cache:'no-cache'});
    if(!response.ok)throw new Error('No se pudo leer la base');
    data=await response.json();
    const years=[...new Set(data.votaciones.map(v=>v.fecha.slice(0,4)))].sort().reverse();
    $('#votes-year').innerHTML='<option value="all">Todo el histórico</option>'+years.map(y=>`<option>${y}</option>`).join('');
    ['#votes-year','#votes-active'].forEach(id=>$(id).addEventListener('change',()=>{page=0;render();}));
    mountTypeFilter('#votes-types',()=>{page=0;render();},{additional:[{id:'otros',label:'Otros asuntos'},{id:'sin-datos',label:'Sin categoría identificada'}]});
    $('#votes-list-scope').addEventListener('change',()=>{page=0;renderList();});
    $('#votes-reset').addEventListener('click',()=>{
      $('#votes-year').value='all';$('#votes-active').checked=false;$('#votes-grouped').checked=true;
      $('#votes-types').querySelectorAll('input').forEach(input=>input.checked=true);
      $('#votes-list-scope').value='all';$('#votes-search').value='';selectedSeries=null;page=0;render();
    });
    $('#votes-grouped').addEventListener('change',()=>{page=0;selectedSeries=null;render();});
    $('#votes-search').addEventListener('input',()=>{page=0;renderList();});
    $('#votes-controls').hidden=false;$('#votes-content').hidden=false;
    render();
  }catch(error){
    data=null;
    $('#votes-state').innerHTML='No se pudo cargar la base de votos. <button type="button" id="votes-retry">Reintentar</button>';
    $('#votes-retry').addEventListener('click',()=>renderVotes());
  }finally{loading=false;}
}
function filters(){return {year:$('#votes-year').value,types:checkedValues('#votes-types'),
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
  const f=filters(),comparison=compareOfficialism(data,f),{general,contested}=comparison;
  const annual=annualSeries(data,{...f,contested:false}),annualContested=annualSeries(data,{...f,contested:true});
  $('#votes-state').textContent=`${fmt(data.resumen.votaciones)} votaciones nominales desde ${data.desde.slice(0,4)} · ${fmt(data.resumen.votos)} registros individuales · Consulta: ${new Date(data.actualizado).toLocaleDateString('es-AR')}`;
  $('#votes-subtitle').textContent='Promedio de las tasas individuales de coincidencia con el PRO. Ordenado por coincidencia general; ambas medidas usan los mismos filtros.';
  $('#votes-filter-summary').textContent=`Filtros para ambas medidas: ${f.year==='all'?'todo el histórico':f.year} · ${f.types.length===6?'todos los tipos':f.types.map(id=>$('#votes-types input[value="'+id+'"]').parentElement.textContent).join(', ')} · ${f.activeIds?'solo legisladores actuales':'todos los legisladores de cada fecha'}. Una votación que coincide con varios tipos se cuenta una sola vez.`;
  $('#votes-denominator').textContent=`General: ${fmt(general.eligible)} votaciones comparables de ${fmt(general.ballots)} seleccionadas. Con disidencias: ${fmt(contested.eligible)} de ${fmt(contested.ballots)}. Se excluyen por empate o falta de referencia ${fmt(general.withoutReference)} y ${fmt(contested.withoutReference)}, respectivamente; por inconsistencias, ${fmt(general.inconsistent)} y ${fmt(contested.inconsistent)}. “No votó” entra en el denominador individual de ambas medidas.`;
  $('#votes-trend-general-note').textContent=`Todas las votaciones de los años y tipos seleccionados, incluidos los consensos. ${fmt(general.eligible)} con referencia del PRO definida.`;
  $('#votes-trend-contested-note').textContent=`Mismos filtros, solo votaciones con disidencias entre afirmativo, negativo y abstención. ${fmt(contested.eligible)} con referencia del PRO definida. Misma escala de 0 a 100%.`;
  const first=data.cobertura_anual?.find(y=>y.primera)?.primera||data.desde;
  $('#votes-history-note').textContent=`Toda la serie se calcula con nuestro scrapeo de votos oficiales. Primera votación publicada recuperada: ${first}. ${first.slice(0,4)} comienza en esa fecha; ${data.hasta.slice(0,4)} es parcial. Todos los filtros se aplican a todo el histórico disponible.`;
  renderTrend(annual.series,annualContested.series);
  $('#votes-ranking').innerHTML=comparison.rows.length?comparison.rows.map(g=>`<div class="vote-rank"><h4>${esc(g.name)}</h4>${rankMeasure(g,'General')}${rankMeasure(g.contested,'Con disidencias')}</div>`).join(''):'<p class="empty">No hay votos comparables. Probá otros tipos o restablecé los filtros.</p>';
  renderTable(annual.series,annualContested.series);renderContinuities();
  $('#votes-quality').textContent=`Se conservan ${fmt(data.resumen.sin_bloque_historico)} registros sin bloque histórico y ${fmt(data.resumen.recuentos_distintos_60)} votaciones con recuento distinto de 60 personas. ${fmt(data.resumen.totales_inconsistentes)} votaciones inconsistentes se excluyen del indicador. ${fmt(data.resumen.sin_categoria||0)} votaciones no tienen categoría identificada. Una sesión sin registros no prueba que no se haya votado.`;
  renderList();
}
function rankMeasure(row,label){
  return `<div class="vote-measure"><div class="vote-rank-label"><span>${label}</span><strong>${row?percent(row.rate):'Sin votos comparables'}</strong></div><div class="vote-track" aria-hidden="true">${row?`<i style="width:${row.rate*100}%;background:${color(row.id)}"></i>`:''}</div><p>${row?`${fmt(row.people)} ${row.people===1?'legislador':'legisladores'} · ${fmt(row.ballots)} votaciones · ${fmt(row.total)} registros · ${fmt(row.nonvotes)} “no votó”`:'Sin registros para calcular esta medida con los filtros seleccionados.'}</p></div>`;
}
function renderTrend(series,contestedSeries){
  if(selectedSeries===null)selectedSeries=new Set(['119','124','104','114','107','9'].map(id=>blockKey(data,id)));
  $('#votes-series').innerHTML=`<div class="vote-series-actions"><button type="button" id="votes-series-all">Todos</button><button type="button" id="votes-series-none">Ninguno</button></div><div class="vote-series-options">${series.map(s=>`<label><input type="checkbox" value="${esc(s.id)}" ${selectedSeries.has(s.id)?'checked':''}><i style="background:${color(s.id)}" aria-hidden="true"></i>${esc(s.name)}</label>`).join('')}</div>`;
  $('#votes-series').querySelectorAll('input').forEach(input=>input.onchange=()=>{input.checked?selectedSeries.add(input.value):selectedSeries.delete(input.value);drawTrends(series,contestedSeries);});
  $('#votes-series-all').onclick=()=>{selectedSeries=new Set(series.map(s=>s.id));renderTrend(series,contestedSeries);};
  $('#votes-series-none').onclick=()=>{selectedSeries=new Set();renderTrend(series,contestedSeries);};
  drawTrends(series,contestedSeries);
}
function drawTrends(series,contestedSeries){
  const years=series.flatMap(s=>s.points.map(p=>p.year));
  drawTrend(series,'#votes-trend','General',years);
  drawTrend(contestedSeries,'#votes-trend-contested','Con disidencias',years);
}
function drawTrend(series,target,measure,allYears){
  const selected=series.filter(s=>selectedSeries.has(s.id)),root=d3.select(target);root.selectAll('*').remove();
  if(!selected.length){root.append('p').attr('class','empty').text(!selectedSeries.size?'Elegí uno o más bloques para ver su evolución.':'No hay votos comparables para los bloques y filtros seleccionados.');return;}
  const min=Math.min(...allYears),max=Math.max(...allYears);
  const w=1040,h=410,m={top:34,right:295,bottom:45,left:48};
  const x=d3.scaleLinear().domain(min===max?[min-.5,max+.5]:[min,max]).range([m.left,w-m.right]);
  const y=d3.scaleLinear().domain([0,1]).range([h-m.bottom,m.top]);
  const svg=root.append('svg').attr('viewBox',`0 0 ${w} ${h}`).attr('role','img').attr('aria-label',`Coincidencia ${measure.toLowerCase()} con el PRO, de cero a cien por ciento. Tabla de datos a continuación.`);
  svg.append('title').text(`${measure}: evolución anual de coincidencia con el PRO`);
  svg.append('g').attr('class','chart-grid').attr('transform',`translate(${m.left},0)`).call(d3.axisLeft(y).tickValues([0,.25,.5,.75,1]).tickSize(-(w-m.right-m.left)).tickFormat(v=>percent(v)));
  svg.append('g').attr('transform',`translate(0,${h-m.bottom})`).call(d3.axisBottom(x).tickValues(d3.range(min,max+1)).tickFormat(d3.format('d')));
  const endpoints=[];
  for(const s of selected){
    const g=svg.append('g'),c=color(s.id);
    for(let i=1;i<s.points.length;i++){
      const a=s.points[i-1],b=s.points[i];if(b.year-a.year!==1)continue;
      g.append('line').attr('x1',x(a.year)).attr('y1',y(a.rate)).attr('x2',x(b.year)).attr('y2',y(b.rate)).attr('stroke',c).attr('stroke-width',2);
    }
    g.selectAll('circle').data(s.points).join('circle').attr('cx',p=>x(p.year)).attr('cy',p=>y(p.rate)).attr('r',3.5).attr('stroke',c).attr('stroke-width',1.5).attr('fill',c).append('title').text(p=>`${measure} · ${s.name} · ${p.year}: ${percent(p.rate)} · ${fmt(p.people)} legisladores · ${fmt(p.total)} registros`);
    const last=s.points.at(-1);endpoints.push({s,last,natural:y(last.rate),label:y(last.rate),c});
  }
  endpoints.sort((a,b)=>a.label-b.label);
  for(let i=1;i<endpoints.length;i++)endpoints[i].label=Math.max(endpoints[i].label,endpoints[i-1].label+17);
  if(endpoints.at(-1).label>h-m.bottom){const excess=endpoints.at(-1).label-(h-m.bottom);endpoints.forEach(p=>p.label-=excess);}
  for(const p of endpoints){
    svg.append('path').attr('d',`M${x(p.last.year)+5},${p.natural}L${w-m.right+12},${p.label}H${w-m.right+20}`).attr('stroke',p.c).attr('fill','none').attr('stroke-opacity',.6);
    svg.append('text').attr('x',w-m.right+25).attr('y',p.label+4).attr('fill','var(--ink)').attr('class','vote-series-label').text(`${p.s.name.length>35?p.s.name.slice(0,33)+'…':p.s.name} · ${percent(p.last.rate)}`);
  }
  const points=selected.flatMap(s=>s.points.map(p=>({...p,name:s.name,color:color(s.id)})));
  const nearest=d3.Delaunay.from(points,p=>x(p.year),p=>y(p.rate));
  const highlight=svg.append('circle').attr('r',6).attr('fill','none').attr('stroke-width',2).attr('opacity',0);
  const tip=root.append('div').attr('class','votes-chart-tooltip').attr('aria-hidden','true');
  // Marks and hit layer share SVG-root coordinates, including the same margins.
  svg.append('rect').attr('x',m.left).attr('y',m.top).attr('width',w-m.right-m.left).attr('height',h-m.top-m.bottom).attr('fill','transparent')
    .on('pointermove',event=>{
      const [px,py]=d3.pointer(event,svg.node()),p=points[nearest.find(px,py)];
      highlight.attr('cx',x(p.year)).attr('cy',y(p.rate)).attr('stroke',p.color).attr('opacity',1);
      const box=highlight.node().getBoundingClientRect();
      tip.text(`${measure} · ${p.name} · ${p.year}: ${percent(p.rate)} · ${fmt(p.people)} legisladores · ${fmt(p.total)} registros`).style('left',`${Math.min(window.innerWidth-160,Math.max(160,box.x+box.width/2))}px`).style('top',`${box.y-12}px`).style('opacity',1);
    }).on('pointerleave',()=>{tip.style('opacity',0);highlight.attr('opacity',0);});
}
function renderTable(series,contestedSeries){
  const years=[...new Set(series.flatMap(s=>s.points.map(p=>p.year)))].sort();
  const contestedById=new Map(contestedSeries.map(s=>[s.id,s]));
  $('#votes-years').innerHTML=`<div class="table-scroll"><table><caption>Coincidencia anual con el PRO · promedio por legislador · ambas medidas con los mismos filtros</caption><thead><tr><th scope="col" rowspan="2">Bloque / trayectoria</th>${years.map(y=>`<th scope="colgroup" colspan="2">${y}</th>`).join('')}</tr><tr>${years.map(()=>'<th scope="col">General</th><th scope="col">Con disidencias</th>').join('')}</tr></thead><tbody>${series.map(s=>`<tr><th scope="row">${esc(s.name)}</th>${years.map(year=>[s,contestedById.get(s.id)].map(serie=>{const p=serie?.points.find(p=>p.year===year);return `<td>${p?percent(p.rate):'Sin votos comparables'}</td>`;}).join('')).join('')}</tr>`).join('')}</tbody></table></div>`;
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
