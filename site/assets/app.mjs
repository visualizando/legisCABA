import {categories,normalize,signers,filterProjects,personStats,makeGraph,partners} from './model.mjs';

const $ = selector => document.querySelector(selector);
const fmt = n => new Intl.NumberFormat('es-AR').format(n);
const esc = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const displayName = name => name.split(',').map(s=>s.trim().toLocaleLowerCase('es-AR').replace(/(^|\s)\p{L}/gu,c=>c.toLocaleUpperCase('es-AR'))).join(', ');
const cat = id => categories.find(c=>c.id===id);
const group = person => dataset.grupos_visuales?.find(g=>g.id===person?.grupo_visual)||dataset.grupos.find(g=>g.id===person?.grupo)||{nombre:person?.bloque_referencia||'Bloque no disponible',color:'#727a77'};
function groupBadge(person){const g=group(person);return `<span class="group-badge" style="--group:${g.color}"><i aria-hidden="true"></i>${esc(person.bloque_referencia||g.nombre)}</span>`;}
function blockLabel(person){return person.bloque_referencia_nota||'Bloque de referencia';}
function groupLegend(target){$(target).innerHTML=(dataset.grupos_visuales||dataset.grupos.filter(g=>g.vigente)).filter(g=>!$('#active-only').checked||g.id!=='historicos').map(g=>`<span class="legend-item" style="--cat:${g.color}"><i aria-hidden="true"></i>${esc(g.nombre)}</span>`).join('');}
const dateFmt = date => new Date(date+'T12:00:00').toLocaleDateString('es-AR',{day:'numeric',month:'short',year:'numeric'});
const initials = name => name.split(',').map(s=>s.trim()[0]||'').join('').slice(0,2);
let dataset, selected=[],visiblePeople=[],stats=new Map(),peopleById,route='panorama',personId=null;
let graph, graphZoom, selectedNode=null;
const pagination = {all:0,profile:0};
const state = {year:'all',category:'all'};
const viewCopy = {
  panorama:['','Panorama',''],
  legisladores:['','Legisladores',''],
  proyectos:['','Proyectos',''],
  red:['','Coautorías',''],
  ficha:['','Ficha',''],
  metodologia:['','Metodología',''],
};

function metric(value,label,sub=''){
  return `<div class="metric"><div class="metric-value">${fmt(value)}</div><div class="metric-label">${label}</div><p class="metric-sub">${sub}</p></div>`;
}
function legend(target){
  $(target).innerHTML=categories.map(c=>`<span class="legend-item" style="--cat:${c.color}"><i aria-hidden="true"></i>${c.label}</span>`).join('');
}
function figureSvg(target,width,height,label){
  const root=d3.select(target);root.selectAll('*').remove();
  const svg=root.append('svg').attr('viewBox',`0 0 ${width} ${height}`).attr('role','img').attr('aria-label',label);
  svg.append('title').text(label);return svg;
}
function profileMetricsChart(s){
  const rows=[
    {label:'Proyectos firmados',author:s.author,coauthor:s.coauthor},
    {label:'Con sanción',author:s.authored.filter(p=>p.sancion).length,coauthor:s.coauthored.filter(p=>p.sancion).length},
    {label:'Con registro en sesión',author:s.authored.filter(p=>p.sesiones.length).length,coauthor:s.coauthored.filter(p=>p.sesiones.length).length},
  ];
  const target='#profile-metrics',root=$(target);
  root.innerHTML='<h2>Participación en proyectos</h2><div class="profile-role-legend"><span><i class="author-key"></i>Autoría</span><span><i class="coauthor-key"></i>Coautoría</span></div><div class="chart profile-summary-chart"></div><p class="note">Los proyectos con sanción y con registro en sesión pueden coincidir.</p>';
  const width=Math.max(260,root.clientWidth),left=0,right=48,height=300;
  const x=d3.scaleLinear().domain([0,s.author+s.coauthor||1]).range([left,width-right]);
  const description=rows.map(r=>`${r.label}: ${fmt(r.author+r.coauthor)}; ${fmt(r.author)} autorías y ${fmt(r.coauthor)} coautorías`).join('. ');
  const svg=figureSvg('#profile-metrics .chart',width,height,description);
  rows.forEach((r,i)=>{
    const y=28+i*82,total=r.author+r.coauthor;
    svg.append('text').attr('class','summary-label').attr('x',0).attr('y',y-10).text(r.label);
    let offset=0;
    for(const [key,color] of [['author','#245d78'],['coauthor','#c3d4dc']]){
      const segmentWidth=x(r[key]);
      svg.append('rect').attr('x',x(offset)).attr('y',y).attr('width',segmentWidth).attr('height',32).attr('fill',color).append('title').text(`${key==='author'?'Autoría':'Coautoría'}: ${fmt(r[key])}`);
      if(segmentWidth>28)svg.append('text').attr('class','summary-count').attr('x',x(offset)+segmentWidth/2).attr('y',y+21).attr('text-anchor','middle').style('fill',key==='author'?'#fff':'#202726').text(fmt(r[key]));
      offset+=r[key];
    }
    svg.append('text').attr('class','summary-total').attr('x',x(total)+8).attr('y',y+21).text(fmt(total));
    if(x(r.author)<=28||x(r.coauthor)<=28)svg.append('text').attr('x',0).attr('y',y+48).text(`${fmt(r.author)} autorías · ${fmt(r.coauthor)} coautorías`);
  });
  svg.append('g').attr('class','axis').attr('transform','translate(0,278)').call(d3.axisBottom(x).ticks(width<450?3:6).tickFormat(fmt));
}
function categoriesChart(target,rows,profile=false){
  const width=Math.max(260,$(target).clientWidth),height=profile?300:260,left=width<380?126:157,right=42,top=16;
  const max=d3.max(rows,r=>profile?Math.max(r.author,r.coauthor):r.value)||1;
  const x=d3.scaleLinear().domain([0,max]).nice().range([left,width-right]);
  const y=d3.scaleBand().domain(rows.map(r=>r.id)).range([top,height-38]).padding(.32);
  const description=rows.map(r=>`${r.label}: ${profile?`${r.author} autorías y ${r.coauthor} coautorías`:r.value}`).join('. ');
  const svg=figureSvg(target,width,height,description);
  svg.append('g').attr('class','axis').attr('transform',`translate(0,${height-28})`).call(d3.axisBottom(x).ticks(width<380?2:4).tickFormat(fmt));
  for(const r of rows){
    const yy=y(r.id),band=y.bandwidth();
    svg.append('text').attr('x',0).attr('y',yy+band/2+4).text(r.label);
    if(profile){
      for(const [key,offset,opacity] of [['author',0,1],['coauthor',band/2+2,.28]]){
        svg.append('rect').attr('x',left).attr('y',yy+offset).attr('width',x(r[key])-left).attr('height',Math.max(7,band/2-2)).attr('fill',r.color).attr('opacity',opacity);
        svg.append('text').attr('x',x(r[key])+7).attr('y',yy+offset+10).text(fmt(r[key]));
      }
    }else{
      svg.append('rect').attr('x',left).attr('y',yy).attr('width',x(r.value)-left).attr('height',band).attr('fill',r.color);
      svg.append('text').attr('x',x(r.value)+8).attr('y',yy+band/2+4).style('font-weight','700').text(fmt(r.value));
    }
  }
  if(profile){
    const root=d3.select(target);root.append('p').attr('class','note').style('margin-top','8px').text('Oscuro: autoría · claro: coautoría');
  }
}
function monthlyChart(){
  const min=state.year==='all'?dataset.desde:state.year+'-01-01';
  const max=state.year==='all'?dataset.hasta:(state.year===dataset.hasta.slice(0,4)?dataset.hasta:state.year+'-12-31');
  let cursor=new Date(min.slice(0,7)+'-01T12:00:00'),last=new Date(max+'T12:00:00');const months=[];
  while(cursor<=last){const key=`${cursor.getFullYear()}-${String(cursor.getMonth()+1).padStart(2,'0')}`;months.push({key,...Object.fromEntries(categories.map(c=>[c.id,0]))});cursor=new Date(cursor.getFullYear(),cursor.getMonth()+1,1,12);}
  const byMonth=new Map(months.map(m=>[m.key,m]));
  for(const p of selected){const m=byMonth.get(p.fecha.slice(0,7));if(m)m[p.categoria]++;}
  const w=Math.max(260,$('#monthly-chart').clientWidth),h=260,m={l:36,r:8,t:18,b:34};
  const x=d3.scaleBand().domain(months.map(m=>m.key)).range([m.l,w-m.r]).padding(.18);
  const y=d3.scaleLinear().domain([0,d3.max(months,m=>d3.sum(categories,c=>m[c.id]))||1]).nice().range([h-m.b,m.t]);
  const svg=figureSvg('#monthly-chart',w,h,`Proyectos por mes. ${months.map(m=>m.key+': '+d3.sum(categories,c=>m[c.id])).join('; ')}`);
  svg.append('g').attr('class','chart-grid').attr('transform',`translate(${m.l},0)`).call(d3.axisLeft(y).ticks(4).tickSize(-(w-m.l-m.r)).tickFormat(fmt));
  const stack=d3.stack().keys(categories.map(c=>c.id))(months);
  svg.selectAll('g.series').data(stack).join('g').attr('fill',s=>cat(s.key).color).selectAll('rect').data(s=>s).join('rect').attr('x',d=>x(d.data.key)).attr('y',d=>y(d[1])).attr('height',d=>Math.max(0,y(d[0])-y(d[1]))).attr('width',x.bandwidth()).append('title').text(d=>`${d.data.key}: ${d[1]-d[0]} proyectos en esta categoría`);
  const step=Math.max(1,Math.ceil(months.length/(w<380?3:5)));
  svg.append('g').attr('class','axis').attr('transform',`translate(0,${h-m.b})`).call(d3.axisBottom(x).tickValues(months.filter((m,i)=>i%step===0).map(m=>m.key)).tickFormat(k=>new Date(k+'-01T12:00:00').toLocaleDateString('es-AR',{month:'short',year:'2-digit'})));
}
function renderOverview(){
  const visibleIds=new Set(visiblePeople.map(p=>p.id));
  const ids=new Set(selected.flatMap(signers).filter(id=>visibleIds.has(id)));
  $('#overview-metrics').innerHTML=metric(selected.length,'Proyectos presentados','Expedientes únicos')+metric(ids.size,'Legisladores con firmas','Autoría o coautoría')+metric(selected.filter(p=>p.sancion).length,'Con sanción','Indicador oficial del expediente')+metric(selected.filter(p=>p.sesiones.length).length,'Con registro en sesión','Presencia en asuntos considerados');
  const rows=categories.map(c=>({...c,value:selected.filter(p=>p.categoria===c.id).length}));
  categoriesChart('#type-chart',rows);monthlyChart();legend('#type-legend');
  $('#type-chart-table').innerHTML=`<details><summary>Ver tabla</summary><table><thead><tr><th>Tipo</th><th>Proyectos</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${r.label}</td><td>${fmt(r.value)}</td></tr>`).join('')}</tbody></table></details>`;
  const ranking=[...visiblePeople].sort((a,b)=>stats.get(b.id).author-stats.get(a.id).author||a.nombre.localeCompare(b.nombre,'es')).filter(p=>stats.get(p.id).author>0).slice(0,10),max=stats.get(ranking[0]?.id)?.author||1;
  $('#ranking').innerHTML=ranking.length?ranking.map((p,i)=>`<a class="rank-row" href="#ficha/${p.id}"><span class="rank-num">${String(i+1).padStart(2,'0')}</span><span class="rank-main">${esc(displayName(p.nombre))}<span class="rank-political">${groupBadge(p)}</span><span class="rank-bar" aria-hidden="true"><i style="width:${stats.get(p.id).author/max*100}%;background:${group(p).color}"></i></span></span><span class="rank-value">${fmt(stats.get(p.id).author)}</span></a>`).join(''):'<p class="empty">Sin autorías. Cambiá los filtros.</p>';
}
function renderPeople(){
  const term=normalize($('#person-search').value),order=$('#person-sort').value;
  const filterGroup=$('#person-group').value;
  const people=visiblePeople.filter(p=>normalize(p.nombre+' '+p.bloque_referencia+' '+group(p).nombre).includes(term)&&(filterGroup==='all'||p.grupo===filterGroup||filterGroup.startsWith('visual:')&&p.grupo_visual===filterGroup.slice(7)));
  groupLegend('#people-group-legend');
  people.sort((a,b)=>order==='name'?a.nombre.localeCompare(b.nombre,'es'):stats.get(b.id)[order]-stats.get(a.id)[order]||a.nombre.localeCompare(b.nombre,'es'));
  $('#person-count').textContent=`${fmt(people.length)} legisladores`;
  $('#person-cards').innerHTML=people.length?people.map(p=>{
    const s=stats.get(p.id),total=s.signed.length;
    return `<a class="person-card" href="#ficha/${p.id}" style="--group:${group(p).color}"><div class="person-top"><span class="avatar" aria-hidden="true">${esc(initials(p.nombre))}</span><div><h2>${esc(displayName(p.nombre))}</h2><p class="person-meta">${p.activo?'Padrón activo':'Con actividad en el ciclo'}</p></div></div>${groupBadge(p)}<p class="card-block">${esc(blockLabel(p))}</p><div class="card-numbers"><div><strong>${fmt(s.author)}</strong><span>Autorías</span></div><div><strong>${fmt(s.coauthor)}</strong><span>Coautorías</span></div></div><div class="mini-stack" aria-hidden="true">${s.types.map(t=>`<i style="--cat:${t.color};width:${total?(t.author+t.coauthor)/total*100:0}%"></i>`).join('')}</div><div class="card-foot"><span>${fmt(s.sanction)} con sanción · ${fmt(s.session)} en sesión</span><span class="arrow" aria-hidden="true">↗</span></div></a>`;
  }).join(''):'<p class="empty">Sin resultados. Cambiá los filtros.</p>';
}
function renderProfile(){
  const p=peopleById.get(personId);if(!p){$('#profile-heading').innerHTML='<p class="empty">Ficha no disponible. Volvé al listado.</p>';$('#profile-metrics').innerHTML='';$('#profile-types').innerHTML='';$('#profile-partners').innerHTML='';$('#profile-projects').innerHTML='';return;}
  const s=stats.get(p.id);
  $('#profile-heading').innerHTML=`<span class="avatar" aria-hidden="true" style="border-left:5px solid ${group(p).color}">${esc(initials(p.nombre))}</span><div><h2>${esc(displayName(p.nombre))}</h2>${groupBadge(p)}<p>${esc(blockLabel(p))}</p>${p.mandato_actual?`<p>Mandato vigente: ${dateFmt(p.mandato_actual.desde)} — ${dateFmt(p.mandato_actual.hasta)}</p>`:''}<details class="block-history"><summary>Historial de bloques</summary><ul>${p.bloques_historia.map(b=>`<li>${esc(b.bloque)} · ${dateFmt(b.desde)} — ${b.hasta?dateFmt(b.hasta):'sin fecha de fin'}</li>`).join('')}</ul></details></div><a class="text-link" href="${esc(p.url)}" target="_blank" rel="noopener">Ficha oficial ↗</a>`;
  profileMetricsChart(s);
  categoriesChart('#profile-types',s.types,true);
  const collabs=partners(selected,p.id,visiblePeople).slice(0,10);
  $('#profile-partners').innerHTML=collabs.length?collabs.map(c=>`<a class="profile-partner" href="#ficha/${c.id}"><span>${esc(displayName(c.nombre))}<small class="partner-political">${groupBadge(c)}</small></span><span>${fmt(c.value)}</span></a>`).join(''):'<p class="empty">Sin proyectos compartidos.</p>';
  const role=$('#profile-role').value;renderProjects('#profile-projects',role==='author'?s.authored:role==='coauthor'?s.coauthored:s.signed,'profile');
  document.title=`${displayName(p.nombre)} — LegisCABA`;
}
function authorLink(person){if(!peopleById.has(person.id))return esc(displayName(person.nombre));const p=peopleById.get(person.id);return `<span class="identified-person"><a href="#ficha/${person.id}">${esc(displayName(person.nombre))}</a> ${groupBadge(p)}</span>`;}
function projectHtml(p){
  const c=cat(p.categoria);
  const ses=p.sesiones.length?`<ul>${p.sesiones.map(s=>`<li>${esc(dateFmt(s.fecha))} · ${esc(s.tipo)}: ${esc(s.descripcion)} <a href="https://parlamentaria.legislatura.gob.ar/pages/sesion_votaciones.aspx?IdSesion=${encodeURIComponent(s.sesion)}" target="_blank" rel="noopener">Ver sesión ↗</a></li>`).join('')}</ul>`:'<p>Sin registro en las sesiones consultadas.</p>';
  return `<article class="project-item"><div class="project-top"><a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.numero)} ↗</a><time datetime="${p.fecha}">${dateFmt(p.fecha)}</time><span class="badge category-badge" style="--cat:${c.color}">${c.short}</span>${p.sancion?'<span class="badge">Con sanción</span>':''}${p.sesiones.length?'<span class="badge">Registro en sesión</span>':''}</div><h3>${esc(p.sumario)}</h3><p class="author-line">Autor/a: ${authorLink(p.autor)}${p.cofirmantes.length?` · ${fmt(p.cofirmantes.length)} cofirmante${p.cofirmantes.length===1?'':'s'}`:''}</p><details><summary>Ver detalle</summary><div class="project-details"><p><strong>Tipo oficial:</strong> ${esc(p.tipo_oficial)}${p.categoria==='informes'?' · Pedido de informes identificado por el sumario.':''}</p><p><strong>Estado:</strong> ${esc(p.estado)}<br><strong>Ubicación:</strong> ${esc(p.ubicacion)}</p><p><strong>Cofirmantes:</strong> ${p.cofirmantes.length?p.cofirmantes.map(authorLink).join(' · '):'Sin cofirmantes registrados'}</p><p><strong>Actuaciones en sesión:</strong></p>${ses}<p><a href="${esc(p.url)}" target="_blank" rel="noopener">Expediente oficial ↗</a>${p.documento?` · <a href="${esc(p.documento)}" target="_blank" rel="noopener">Abrir documento ↗</a>`:''}</p></div></details></article>`;
}
function renderProjects(target,rows,key){
  const sorted=[...rows].sort((a,b)=>b.fecha.localeCompare(a.fecha)||Number(b.id)-Number(a.id)),size=20;
  const pages=Math.max(1,Math.ceil(rows.length/size));pagination[key]=Math.min(pagination[key],pages-1);
  const page=pagination[key],offset=page*size;
  $(target).innerHTML=`<div class="project-toolbar"><p>${fmt(rows.length)} proyecto${rows.length===1?'':'s'}${rows.length?` · ${fmt(offset+1)}–${fmt(Math.min(rows.length,offset+size))}`:''}</p><div class="pagination"><button type="button" data-page="prev" ${page===0?'disabled':''} aria-label="Página anterior">←</button><span>${page+1} / ${pages}</span><button type="button" data-page="next" ${page===pages-1?'disabled':''} aria-label="Página siguiente">→</button></div></div><div class="project-list">${sorted.slice(offset,offset+size).map(projectHtml).join('')||'<p class="empty">Sin resultados. Cambiá la búsqueda o los filtros.</p>'}</div>`;
  $(target).querySelectorAll('[data-page]').forEach(btn=>btn.addEventListener('click',()=>{pagination[key]+=btn.dataset.page==='prev'?-1:1;renderProjects(target,rows,key);$(target).scrollIntoView({block:'start',behavior:'instant'});$(target).querySelector('.pagination button:not(:disabled)')?.focus({preventScroll:true});}));
}
function renderAllProjects(){
  const term=normalize($('#project-search').value),status=$('#project-status').value;
  const exactNumber=/^\d+-[a-z]+-\d{4}$/.test(term.trim());
  const rows=selected.filter(p=>(!term||(exactNumber?normalize(p.numero)===term.trim():normalize(p.numero+' '+p.sumario+' '+p.autor.nombre).includes(term)))&&(status==='all'||status==='sanction'&&p.sancion||status==='session'&&p.sesiones.length||status==='no-sanction'&&!p.sancion));
  renderProjects('#all-projects',rows,'all');
}

function renderNetwork(){
  const minimum=Number($('#edge-min').value),mode=$('#edge-mode').value;
  graph=makeGraph(selected,visiblePeople,mode,minimum);graphZoom=null;const svg=d3.select('#network');svg.selectAll('*').remove();
  $('#zoom-in').disabled=!graph.nodes.length;$('#zoom-out').disabled=!graph.nodes.length;
  const w=Math.max(320,$('#network').clientWidth),h=Math.min(600,Math.max(420,w/1.4));svg.attr('viewBox',`0 0 ${w} ${h}`);svg.append('title').text('Red de proyectos compartidos entre legisladores');
  $('#network-stats').textContent=`${graph.nodes.length} nodos · ${fmt(graph.edges.length)} vínculos · ${graph.omitted} sin vínculos visibles`;
  groupLegend('#network-legend');
  if(!graph.nodes.length){svg.append('text').attr('x',w/2).attr('y',h/2).attr('text-anchor','middle').attr('fill','#596461').text('Sin conexiones. Reducí el mínimo.');selectedNode=null;renderNetworkDetail();$('#edge-table').innerHTML='<p class="empty">Sin conexiones para estos filtros.</p>';return;}
  const layer=svg.append('g');graphZoom=d3.zoom().scaleExtent([.35,4]).filter(event=>!event.button&&(event.type!=='wheel'||event.ctrlKey)).on('zoom',event=>layer.attr('transform',event.transform));svg.call(graphZoom).on('dblclick.zoom',null).call(graphZoom.transform,d3.zoomIdentity);
  const radius=d3.scaleSqrt().domain([0,d3.max(graph.nodes,n=>n.total)]).range([4,19]);
  const thickness=d3.scaleSqrt().domain([minimum,d3.max(graph.edges,e=>e.value)||minimum+1]).range([.5,3]);
  const nodes=graph.nodes.map(n=>({...n})),edges=graph.edges.map(e=>({...e}));
  const simulation=d3.forceSimulation(nodes).force('link',d3.forceLink(edges).id(n=>n.id).distance(e=>70+70/(1+e.value/30)).strength(.12)).force('charge',d3.forceManyBody().strength(-110)).force('center',d3.forceCenter(w/2,h/2)).force('collide',d3.forceCollide(n=>radius(n.total)+6)).stop();
  for(let i=0;i<180;i++)simulation.tick();
  const extentX=d3.extent(nodes,n=>n.x),extentY=d3.extent(nodes,n=>n.y),scale=Math.min((w-120)/(extentX[1]-extentX[0]||1),(h-120)/(extentY[1]-extentY[0]||1),1.6);
  for(const n of nodes){n.x=w/2+(n.x-(extentX[0]+extentX[1])/2)*scale;n.y=h/2+(n.y-(extentY[0]+extentY[1])/2)*scale;}
  layer.append('g').selectAll('line').data(edges).join('line').attr('class','network-edge').attr('data-a',e=>e.source.id).attr('data-b',e=>e.target.id).attr('x1',e=>e.source.x).attr('y1',e=>e.source.y).attr('x2',e=>e.target.x).attr('y2',e=>e.target.y).attr('stroke-width',e=>thickness(e.value)).append('title').text(e=>`${displayName(e.source.nombre)} / ${displayName(e.target.nombre)}: ${fmt(e.value)} proyectos`);
  const nodeGroup=layer.append('g').selectAll('g').data(nodes).join('g');
  nodeGroup.append('circle').attr('class','network-node').attr('cx',n=>n.x).attr('cy',n=>n.y).attr('r',n=>radius(n.total)).attr('fill',n=>group(n).color).attr('stroke','#596461').attr('stroke-width',1).attr('role','button').attr('tabindex',0).attr('aria-label',n=>`${displayName(n.nombre)}, ${group(n).nombre}, ${n.bloque_referencia}, ${fmt(n.total)} proyectos firmados; explorar conexiones`).on('click',(event,n)=>selectNetworkNode(n.id)).on('keydown',(event,n)=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();selectNetworkNode(n.id);}}).append('title').text(n=>`${displayName(n.nombre)} · ${group(n).nombre} · ${n.bloque_referencia} · ${fmt(n.total)} proyectos`);
  const topIds=new Set([...nodes].sort((a,b)=>b.total-a.total).slice(0,4).map(n=>n.id));
  nodeGroup.append('text').attr('class','network-label').attr('x',n=>n.x+radius(n.total)+4).attr('y',n=>n.y+3).attr('data-id',n=>n.id).style('display',n=>topIds.has(n.id)?null:'none').text(n=>displayName(n.nombre).split(',')[0]);
  graph.topIds=topIds;
  if(selectedNode&&!graph.nodes.some(n=>n.id===selectedNode))selectedNode=null;
  if(selectedNode)highlightNetwork();renderNetworkDetail();renderEdgeTable();
}
function selectNetworkNode(id){selectedNode=id;highlightNetwork();renderNetworkDetail();}
function highlightNetwork(){
  const adjacent=new Set([selectedNode]);for(const e of graph.edges)if(e.source===selectedNode)adjacent.add(e.target);else if(e.target===selectedNode)adjacent.add(e.source);
  d3.select('#network').selectAll('.network-node').attr('opacity',n=>!selectedNode||adjacent.has(n.id)?1:.18).attr('stroke',n=>n.id===selectedNode?'#202726':'#596461').attr('stroke-width',n=>n.id===selectedNode?3:1);
  d3.select('#network').selectAll('.network-edge').attr('stroke-opacity',e=>!selectedNode ? .2 : (e.source.id===selectedNode||e.target.id===selectedNode ? .75 : .025));
  d3.select('#network').selectAll('.network-label').style('display',n=>n.id===selectedNode||graph.topIds.has(n.id)?null:'none').attr('opacity',n=>!selectedNode||adjacent.has(n.id)?1:.25);
}
function renderNetworkDetail(){
  if(!selectedNode){$('#network-detail').innerHTML='<h2>Conexiones</h2><p>Seleccioná un nodo.</p>';return;}
  const person=peopleById.get(selectedNode),s=stats.get(selectedNode);
  const collabs=graph.allEdges.filter(e=>e.source===selectedNode||e.target===selectedNode).map(e=>({...peopleById.get(e.source===selectedNode?e.target:e.source),value:e.value})).sort((a,b)=>b.value-a.value);
  const top=collabs.slice(0,8);
  $('#network-detail').innerHTML=`<h2>${esc(displayName(person.nombre))}</h2>${groupBadge(person)}<p>${esc(blockLabel(person))}</p><p class="big-number">${fmt(s.signed.length)}</p><p>proyectos firmados</p><a href="#ficha/${person.id}" class="text-link">Ver ficha ↗</a><ol>${top.map(c=>`<li><button type="button" data-node="${c.id}" aria-label="Explorar a ${esc(displayName(c.nombre))}"><span>${esc(displayName(c.nombre))}<small class="partner-political">${groupBadge(c)}</small></span><strong>${fmt(c.value)}</strong></button></li>`).join('')}</ol><p>Incluye vínculos bajo el mínimo del gráfico.</p><button type="button" id="clear-node">Quitar selección</button>`;
  $('#network-detail').querySelectorAll('[data-node]').forEach(b=>b.addEventListener('click',()=>{
    if(graph.nodes.some(n=>n.id===b.dataset.node))selectNetworkNode(b.dataset.node);else location.hash='ficha/'+b.dataset.node;
  }));
  $('#clear-node').addEventListener('click',()=>{selectedNode=null;highlightNetwork();renderNetworkDetail();});
}
function renderEdgeTable(){
  const rows=[...graph.edges].sort((a,b)=>b.value-a.value).slice(0,100);
  $('#edge-table').innerHTML=`<p class="note">100 conexiones más frecuentes.</p><div class="table-scroll"><table><thead><tr><th>Legislador/a</th><th>Legislador/a</th><th>Proyectos en común</th></tr></thead><tbody>${rows.map(e=>`<tr><td>${authorLink(peopleById.get(e.source))}</td><td>${authorLink(peopleById.get(e.target))}</td><td>${fmt(e.value)}</td></tr>`).join('')}</tbody></table></div>`;
}
function render(){
  const copy=viewCopy[route];$('#eyebrow').textContent=copy[0];$('#page-title').innerHTML=copy[1];$('#page-description').textContent=copy[2];$('#page-description').hidden=!copy[2];$('#eyebrow').hidden=!copy[0];
  if(route==='ficha'&&peopleById.has(personId))$('#page-title').textContent=displayName(peopleById.get(personId).nombre);
  $('.filters').hidden=route==='metodologia';document.querySelectorAll('.view').forEach(v=>v.hidden=v.id!=='view-'+route);
  document.querySelectorAll('nav a').forEach(a=>{if(a.hash==='#'+(route==='ficha'?'legisladores':route))a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
  document.title=route==='panorama'?'LegisCABA — Monitor parlamentario':`${route==='red'?'Red de coautorías':route==='metodologia'?'Cómo leer los datos':route[0].toUpperCase()+route.slice(1)} — LegisCABA`;
  if(route==='panorama')renderOverview();if(route==='legisladores')renderPeople();if(route==='ficha')renderProfile();if(route==='proyectos')renderAllProjects();if(route==='red')renderNetwork();
}
function applyFilters(){
  state.year=$('#year').value;state.category=$('#category').value;
  selected=filterProjects(dataset.proyectos,state.year,state.category);
  visiblePeople=dataset.legisladores.filter(p=>!$('#active-only').checked||p.activo);
  if($('#active-only').checked){const ids=new Set(visiblePeople.map(p=>p.id));selected=selected.filter(p=>signers(p).some(id=>ids.has(id)));}
  stats=new Map(dataset.legisladores.map(p=>[p.id,personStats(selected,p.id)]));
  $('#filter-count').textContent=`${fmt(selected.length)} proyectos`;
  pagination.all=0;pagination.profile=0;render();
}
function navigate(){
  const [next,id]=location.hash.slice(1).split('/');if(next==='contenido')return;
  route=Object.hasOwn(viewCopy,next)?next:'panorama';personId=route==='ficha'?id:null;pagination.profile=0;
  render();window.scrollTo({top:0,behavior:'instant'});
}
const debounce=(fn,ms=120)=>{let timer;return(...args)=>{clearTimeout(timer);timer=setTimeout(()=>fn(...args),ms);};};
async function init(){
  try{
    const response=await fetch('data/monitor.json',{cache:'no-cache'});if(!response.ok)throw new Error('No se pudo leer monitor.json');dataset=await response.json();
    if(!globalThis.d3)throw new Error('D3 no está disponible');
    peopleById=new Map(dataset.legisladores.map(p=>[p.id,p]));
    const composition=dataset.composicion_actual||{total:dataset.legisladores.filter(p=>p.activo).length,consultada:dataset.enriquecido,fuente:'https://www.legislatura.gob.ar/seccion/composicion-actual.html'};
    $('#current-composition-note').innerHTML=`${fmt(composition.total)} en la composición actual · ${new Date(composition.consultada).toLocaleDateString('es-AR')}. <a href="${esc(composition.fuente)}" target="_blank" rel="noopener">Fuente oficial ↗</a>`;
    $('#person-group').insertAdjacentHTML('beforeend',dataset.grupos_visuales.map(g=>`<option value="visual:${g.id}">${esc(g.nombre)}</option>`).join('')+'<optgroup label="Bloques oficiales">'+dataset.grupos.map(g=>`<option value="${g.id}">${esc(g.nombre)}</option>`).join('')+'</optgroup>');
    $('#group-mapping').innerHTML=`<details><summary>Ver nombres y colores oficiales</summary><div class="table-scroll"><table><thead><tr><th>Bloque de referencia</th><th>Identificación y color</th></tr></thead><tbody>${[...new Set(dataset.legisladores.map(p=>p.bloque_referencia))].sort().map(b=>{const p=dataset.legisladores.find(p=>p.bloque_referencia===b);return `<tr><td>${esc(b||'No disponible')}</td><td>${groupBadge(p)}</td></tr>`;}).join('')}</tbody></table></div></details>`;
    const years=[...new Set(dataset.proyectos.map(p=>p.fecha.slice(0,4)))].sort().reverse();
    $('#year').insertAdjacentHTML('beforeend',years.map(y=>`<option value="${y}">${y}</option>`).join(''));
    $('#date-range').textContent=`${dateFmt(dataset.desde)} — ${dateFmt(dataset.hasta)}`;
    $('#updated').textContent=`Captura: ${new Date(dataset.actualizado).toLocaleDateString('es-AR')}`;
    $('#coverage-note').textContent=`${dateFmt(dataset.desde)} — ${dateFmt(dataset.hasta)}. ${fmt(dataset.proyectos.length)} proyectos; ${dataset.sesiones_consultadas} sesiones. Estados al ${new Date(dataset.actualizado).toLocaleDateString('es-AR')}.`;
    $('#load-state').hidden=true;$('#app').hidden=false;
    $('#global-filters').addEventListener('submit',e=>e.preventDefault());
    $('#year').addEventListener('change',applyFilters);$('#category').addEventListener('change',applyFilters);
    $('#reset-filters').addEventListener('click',()=>{$('#year').value='all';$('#category').value='all';$('#active-only').checked=false;applyFilters();});
    $('#person-search').addEventListener('input',debounce(renderPeople));$('#person-sort').addEventListener('change',renderPeople);$('#active-only').addEventListener('change',applyFilters);$('#person-group').addEventListener('change',renderPeople);
    $('#project-search').addEventListener('input',debounce(()=>{pagination.all=0;renderAllProjects();}));$('#project-status').addEventListener('change',()=>{pagination.all=0;renderAllProjects();});
    $('#profile-role').addEventListener('change',()=>{pagination.profile=0;renderProfile();});
    $('#edge-min').addEventListener('change',renderNetwork);$('#edge-mode').addEventListener('change',renderNetwork);
    $('#network-reset').addEventListener('click',()=>{selectedNode=null;renderNetwork();});
    $('#zoom-in').addEventListener('click',()=>{if(graphZoom)d3.select('#network').call(graphZoom.scaleBy,1.4);});$('#zoom-out').addEventListener('click',()=>{if(graphZoom)d3.select('#network').call(graphZoom.scaleBy,1/1.4);});
    window.addEventListener('hashchange',navigate);
    window.addEventListener('resize',debounce(()=>{if(route==='panorama')renderOverview();if(route==='ficha')renderProfile();if(route==='red')renderNetwork();},200));
    applyFilters();navigate();
  }catch(error){$('#load-state').innerHTML=`<p>No se pudieron cargar los datos. Recargá la página.</p><p class="note">${esc(error.message)}</p><button type="button" id="retry-load">Volver a cargar</button>`;$('#retry-load').addEventListener('click',()=>location.reload());}
}
init();
