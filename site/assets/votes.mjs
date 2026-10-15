import {officialism,filterBallots,annualSeries,blockKey,blockName} from './votes-model.mjs?v=20261015-historico';
import {categories,normalize} from './model.mjs';
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>new Intl.NumberFormat('es-AR').format(n);
const percent=n=>n===null?'Sin votos':new Intl.NumberFormat('es-AR',{style:'percent',maximumFractionDigits:1}).format(n);
let data,historic,loading=false,page=0,currentIds,selectedSeries=null;
const size=20;
export async function renderVotes(monitor){
  if(monitor)currentIds=new Set(monitor.legisladores.filter(p=>p.activo).map(p=>p.id));
  if(data){render();return;}
  if(loading)return;
  loading=true;$('#votes-state').textContent='Consultando la base de votaciones…';
  try{
    const responses=await Promise.all([fetch('data/votaciones.json',{cache:'no-cache'}),fetch('data/oficialometro-historico.json')]);
    if(responses.some(r=>!r.ok))throw new Error('No se pudo leer la base');
    [data,historic]=await Promise.all(responses.map(r=>r.json()));
    const years=[...new Set([...data.votaciones.map(v=>v.fecha.slice(0,4)),...historic.series.flatMap(s=>s.datos.map(([y])=>String(y)))])].sort().reverse();
    $('#votes-year').innerHTML='<option value="all">Todo el histórico</option>'+years.map(y=>`<option>${y}</option>`).join('');
    ['#votes-year','#votes-category','#votes-contested','#votes-active'].forEach(id=>$(id).addEventListener('change',()=>{page=0;render();}));
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
function filters(){return {year:$('#votes-year').value,category:$('#votes-category').value,
  reference:['119','86','83','7'],contested:$('#votes-contested').checked,grouped:$('#votes-grouped').checked,
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
  const f=filters(),result=officialism(data,f),annual=annualSeries(data,historic,f);
  $('#votes-state').textContent=`${fmt(data.resumen.votaciones)} votaciones nominales desde ${data.desde.slice(0,4)} · ${fmt(data.resumen.votos)} registros individuales · Consulta: ${new Date(data.actualizado).toLocaleDateString('es-AR')}`;
  $('#votes-subtitle').textContent='Coincidencia con la mayoría del PRO: Unión Pro → Vamos Juntos → Vamos por más. Cada voto emitido cuenta una vez.';
  const legacyYear=annual.compatible&&f.year!=='all'&&Number(f.year)<annual.cutover;
  $('#votes-denominator').textContent=legacyYear?'Gráfico y porcentajes: agregado del Observable. Las votaciones nominales del mismo año, cuando están disponibles, se exploran más abajo.':`Base nominal ${f.year==='all'?'2021–'+data.hasta.slice(0,4):f.year}: ${fmt(result.eligible)} votaciones comparables. ${fmt(result.withoutReference)} sin mayoría definida o sin votos emitidos del PRO.${result.inconsistent?` ${fmt(result.inconsistent)} excluidas por inconsistencias.`:''} “No votó” queda fuera del porcentaje.`;
  $('#votes-history-note').textContent=(annual.compatible?'2016–2022: porcentajes agregados del Observable (círculos vacíos). Desde 2023: votos oficiales recalculados (círculos llenos). El enlace punteado marca el cambio de fuente y método; no presupone equivalencia exacta.':'Los años con solo porcentajes agregados del Observable se omiten: no permiten recalcular estos filtros. Se muestran únicamente votos nominales compatibles.')+` ${data.hasta.slice(0,4)} es parcial.`;
  renderTrend(annual.series);
  const rows=legacyYear?annual.series.flatMap(s=>s.points.filter(p=>p.year===Number(f.year)).map(p=>({id:s.id,name:s.name,rate:p.rate,total:null}))):result.rows;
  $('#votes-ranking').innerHTML=rows.length?rows.map(g=>`<div class="vote-rank"><div class="vote-rank-label"><strong>${esc(g.name)}</strong><span>${percent(g.rate)}</span></div><div class="vote-track" aria-hidden="true"><i style="width:${(g.rate??0)*100}%;background:${color(g.id)}"></i></div><p>${g.total===null?'Agregado del Observable · sin denominadores nominales':`${fmt(g.matches)} de ${fmt(g.total)} votos coincidentes · ${fmt(g.ballots)} votaciones · ${fmt(g.nonvotes)} sin voto emitido`}</p></div>`).join(''):'<p class="empty">No hay votos comparables con estos filtros.</p>';
  renderTable(annual.series);renderContinuities();
  $('#votes-quality').textContent=`Se conservan ${fmt(data.resumen.sin_bloque_historico)} registros sin bloque histórico y ${fmt(data.resumen.recuentos_distintos_60)} votaciones con recuento distinto de 60 personas. ${fmt(data.resumen.totales_inconsistentes)} votaciones inconsistentes se excluyen del indicador. ${fmt(data.resumen.sin_categoria||0)} votaciones no tienen categoría identificada. Una sesión sin registros no prueba que no se haya votado.`;
  renderList();
}
function renderTrend(series){
  if(selectedSeries===null)selectedSeries=new Set(['119','124','104','114','107','9'].map(id=>blockKey(data,id)));
  $('#votes-series').innerHTML=`<div class="vote-series-actions"><button type="button" id="votes-series-all">Todos</button><button type="button" id="votes-series-none">Ninguno</button></div><div class="vote-series-options">${series.map(s=>`<label><input type="checkbox" value="${esc(s.id)}" ${selectedSeries.has(s.id)?'checked':''}><i style="background:${color(s.id)}" aria-hidden="true"></i>${esc(s.name)}</label>`).join('')}</div>`;
  $('#votes-series').querySelectorAll('input').forEach(input=>input.onchange=()=>{input.checked?selectedSeries.add(input.value):selectedSeries.delete(input.value);drawTrend(series);});
  $('#votes-series-all').onclick=()=>{selectedSeries=new Set(series.map(s=>s.id));renderTrend(series);};
  $('#votes-series-none').onclick=()=>{selectedSeries=new Set();renderTrend(series);};
  drawTrend(series);
}
function drawTrend(series){
  const selected=series.filter(s=>selectedSeries.has(s.id)),root=d3.select('#votes-trend');root.selectAll('*').remove();
  if(!selected.length){root.append('p').attr('class','empty').text('Elegí uno o más bloques para ver su evolución.');return;}
  const allYears=series.flatMap(s=>s.points.map(p=>p.year)),min=Math.min(...allYears),max=Math.max(...allYears);
  const w=1040,h=510,m={top:34,right:295,bottom:45,left:48};
  const x=d3.scaleLinear().domain(min===max?[min-.5,max+.5]:[min,max]).range([m.left,w-m.right]);
  const y=d3.scaleLinear().domain([0,1]).range([h-m.bottom,m.top]);
  const svg=root.append('svg').attr('viewBox',`0 0 ${w} ${h}`).attr('role','img').attr('aria-label','Evolución anual de coincidencia con el PRO, de cero a cien por ciento. Tabla de datos a continuación.');
  svg.append('title').text('Cómo cambia la coincidencia de cada bloque con el oficialismo');
  svg.append('g').attr('class','chart-grid').attr('transform',`translate(${m.left},0)`).call(d3.axisLeft(y).tickValues([0,.25,.5,.75,1]).tickSize(-(w-m.right-m.left)).tickFormat(v=>percent(v)));
  svg.append('g').attr('transform',`translate(0,${h-m.bottom})`).call(d3.axisBottom(x).tickValues(d3.range(min,max+1)).tickFormat(d3.format('d')));
  if(min<2023&&max>=2023){
    svg.append('line').attr('x1',x(2022.5)).attr('x2',x(2022.5)).attr('y1',m.top).attr('y2',h-m.bottom).attr('stroke','#a7afaa').attr('stroke-dasharray','3 4');
    svg.append('text').attr('x',x(2022.5)+6).attr('y',18).attr('class','vote-chart-note').text('Desde 2023: datos nominales');
  }
  const endpoints=[];
  for(const s of selected){
    const g=svg.append('g'),c=color(s.id);
    for(let i=1;i<s.points.length;i++){
      const a=s.points[i-1],b=s.points[i];if(b.year-a.year!==1)continue;
      g.append('line').attr('x1',x(a.year)).attr('y1',y(a.rate)).attr('x2',x(b.year)).attr('y2',y(b.rate)).attr('stroke',c).attr('stroke-width',2).attr('stroke-dasharray',a.source!==b.source?'4 4':null);
    }
    g.selectAll('circle').data(s.points).join('circle').attr('cx',p=>x(p.year)).attr('cy',p=>y(p.rate)).attr('r',3.5).attr('stroke',c).attr('stroke-width',1.5).attr('fill',p=>p.source==='observable'?'var(--paper)':c).append('title').text(p=>`${s.name} · ${p.year}: ${percent(p.rate)} · ${p.source==='observable'?'Observable, porcentaje agregado':`${fmt(p.matches)} de ${fmt(p.total)} votos`}`);
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
      tip.text(`${p.name} · ${p.year}: ${percent(p.rate)} · ${p.source==='observable'?'Observable':fmt(p.total)+' votos'}`).style('left',`${Math.min(window.innerWidth-160,Math.max(160,box.x+box.width/2))}px`).style('top',`${box.y-12}px`).style('opacity',1);
    }).on('pointerleave',()=>{tip.style('opacity',0);highlight.attr('opacity',0);});
}
function renderTable(series){
  const years=[...new Set(series.flatMap(s=>s.points.map(p=>p.year)))].sort();
  $('#votes-years').innerHTML=`<div class="table-scroll"><table><caption>Coincidencia anual con el PRO · ○ Observable · ● datos nominales</caption><thead><tr><th scope="col">Bloque / trayectoria</th>${years.map(y=>`<th scope="col">${y}</th>`).join('')}</tr></thead><tbody>${series.map(s=>`<tr><th scope="row">${esc(s.name)}</th>${years.map(year=>{const p=s.points.find(p=>p.year===year);return `<td>${p?`${p.source==='observable'?'○':'●'} ${percent(p.rate)}`:'—'}</td>`;}).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function renderContinuities(){
  $('#votes-continuities').innerHTML=`<p>Se unifican movimientos simultáneos de al menos dos legisladores cuando representan al menos el 80% de quienes continuaban en el bloque de origen y de quienes continuaban en el de destino. Se cuentan solo personas con bloque identificado antes y después. Las escisiones y las fusiones sin esa continuidad permanecen separadas. Se conservan los nombres originales en cada voto.</p><div class="table-scroll"><table><thead><tr><th>Origen</th><th>Continuidad</th><th>Fecha</th><th>Movimiento</th><th>Tratamiento</th></tr></thead><tbody>${(data.continuidades||[]).map(c=>`<tr><td>${esc(c.nombre_origen||data.bloques[c.desde]||c.desde)}</td><td>${esc(c.nombre_destino||data.bloques[c.hacia]||c.hacia)}</td><td>${c.fecha}</td><td>${c.legisladores.length}/${c.continuaban_origen} en origen · ${c.legisladores.length}/${c.continuaban_destino} en destino</td><td>${c.unificados?'Unificados':'Separados'}</td></tr>`).join('')}</tbody></table></div>`;
}
function renderList(){
  const f=filters(),term=normalize($('#votes-search').value);
  const rows=filterBallots(data,f).filter(b=>(!f.activeIds||b.votos.some(v=>f.activeIds.has(v.legislador)))&&normalize(`${b.asunto} ${b.fecha} ${(b.proyectos||[]).map(p=>p.numero+' '+p.sumario).join(' ')}`).includes(term)).sort((a,b)=>b.fecha.localeCompare(a.fecha)||Number(b.id)-Number(a.id));
  page=Math.min(page,Math.max(0,Math.ceil(rows.length/size)-1));
  $('#votes-list').innerHTML=`<div class="project-toolbar"><p>${fmt(rows.length)} ${rows.length===1?'votación':'votaciones'} nominales${f.activeIds?' · detalle limitado al padrón actual':''}</p><div class="pagination"><button id="votes-prev" type="button" ${page===0?'disabled':''} aria-label="Votaciones anteriores">←</button><span>${page+1} / ${Math.max(1,Math.ceil(rows.length/size))}</span><button id="votes-next" type="button" ${(page+1)*size>=rows.length?'disabled':''} aria-label="Votaciones siguientes">→</button></div></div>`+rows.slice(page*size,(page+1)*size).map(b=>`<details class="vote-detail"><summary><span>${esc(b.fecha)} · ${esc(b.asunto)}</span><small>${b.positivos} afirmativos · ${b.negativos} negativos · ${b.abstenciones} ${b.abstenciones===1?'abstención':'abstenciones'} · ${(b.categorias||[]).map(c=>esc(categories.find(x=>x.id===c)?.short||c)).join(' / ')||'Sin categoría'}</small></summary>${(b.proyectos||[]).map(p=>`<p>${esc(p.numero)} · ${esc(p.tipo)} · ${esc(p.sumario)}</p>`).join('')}<p><a href="https://parlamentaria.legislatura.gob.ar/pages/sesion_votaciones.aspx?IdSesion=${encodeURIComponent(b.sesion)}" target="_blank" rel="noopener">Ver sesión oficial ↗</a> · Votación ${esc(b.id)}</p><div class="table-scroll"><table><thead><tr><th scope="col">Legislador/a</th><th scope="col">Bloque en la fecha</th><th scope="col">Voto</th><th scope="col">Presencia informada</th></tr></thead><tbody>${b.votos.filter(v=>!f.activeIds||f.activeIds.has(v.legislador)).map(v=>`<tr><td>${esc(data.legisladores[v.legislador])}</td><td>${esc(data.bloques[v.bloque]||'Sin bloque histórico identificado')}</td><td>${esc(v.voto)}</td><td>${esc(v.presencia)}</td></tr>`).join('')}</tbody></table></div></details>`).join('');
  $('#votes-prev').onclick=()=>{page--;renderList();};$('#votes-next').onclick=()=>{page++;renderList();};
}
