import {eligible,historical,upcoming,ranking,monthly,localNow} from './commissions-model.mjs';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pretty=s=>s.toLocaleLowerCase('es-AR').replace(/(^|\s)\p{L}/gu,c=>c.toLocaleUpperCase('es-AR'));
const date=s=>new Date(s+'T12:00:00').toLocaleDateString('es-AR',{day:'numeric',month:'short',year:'numeric'});
const source='<a href="https://parlamentaria.legislatura.gob.ar/pages/calendar.aspx" target="_blank" rel="noopener">Agenda oficial ↗</a>';
let request;
async function load(){
  if(!request)request=fetch('data/comisiones.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('Agenda no disponible');return r.json();}).catch(e=>{request=null;throw e;});
  return request;
}
function meeting(r){return `<li class="commission-meeting"><time datetime="${esc(r.fecha)}T${esc(r.hora||'00:00')}-03:00"><strong>${esc(date(r.fecha))}</strong><span>${esc(r.hora||'Hora a confirmar')} h</span></time><div><a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(pretty(r.nombre_comision))} ↗</a><p>${r.tipo_id==='1'?'Diputados':'Asesores'} · ${esc(pretty(r.salon))}</p></div></li>`;}
function agenda(data,filters={},limit=6){
  const rows=upcoming(data.reuniones,filters);
  const stale=(Date.now()-new Date(data.actualizado).getTime())/86400000>2;
  return `${stale?'<p class="commission-stale">La captura tiene más de dos días. Consultá la agenda oficial para confirmar horarios.</p>':''}${rows.length?`<ol class="commission-agenda">${rows.slice(0,limit).map(meeting).join('')}</ol>${rows.length>limit?`<p class="note">${rows.length-limit} convocatorias más en la ${source}.</p>`:''}`:'<p>No hay próximas reuniones de diputados o asesores publicadas en la captura para esta selección.</p>'}<p class="note">Horarios de Buenos Aires. Consulta hasta el ${date(data.hasta)}. ${source}.</p>`;
}
function activityLine(target,months){
  const width=Math.max(280,target.clientWidth),height=104,left=28,right=12,top=8,bottom=24;
  const peak=Math.max(1,...months.map(m=>m.count));
  const x=i=>left+i/Math.max(1,months.length-1)*(width-left-right);
  const y=n=>height-bottom-n/peak*(height-top-bottom);
  const label=m=>new Date(m+'-15T12:00:00').toLocaleDateString('es-AR',{month:'short',year:'numeric'});
  const ticks=months.map((m,i)=>i===0||i===months.length-1||(m.month.endsWith('-01')&&i>3&&i<months.length-4)?i:-1).filter(i=>i>=0);
  const visibleTicks=width<500?ticks.filter((i,j)=>j===0||j===ticks.length-1||months[i].month==='2025-01'):ticks;
  const description=months.map(m=>`${label(m.month)}: ${m.count}`).join('; ');
  target.innerHTML=`<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Convocatorias mensuales de todas las comisiones"><title>${esc(description)}</title>
    <path d="M${left},${y(0)}H${width-right}" stroke="var(--line)" fill="none"/>
    <text x="${left-7}" y="${y(peak)+4}" text-anchor="end">${peak}</text><text x="${left-7}" y="${y(0)+3}" text-anchor="end">0</text>
    <polyline points="${months.map((m,i)=>`${x(i)},${y(m.count)}`).join(' ')}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round"/>
    ${visibleTicks.map(i=>`<text x="${x(i)}" y="${height-4}" text-anchor="${i===0?'start':i===months.length-1?'end':'middle'}">${esc(i===0||i===months.length-1?label(months[i].month):months[i].month.slice(0,4))}</text>`).join('')}</svg>`;
}
export async function renderMiniAgenda(){
  const root=document.querySelector('#home-agenda');
  if(!root||root.dataset.ready)return;
  root.innerHTML='<p role="status">Cargando próximas reuniones…</p>';
  try{const data=await load();root.innerHTML=`<div class="commission-mini-heading"><h2>Próximas reuniones</h2><a href="#comisiones">Explorar comisiones →</a></div>${agenda(data,{},4)}`;root.dataset.ready='1';}
  catch{root.innerHTML='<h2>Próximas reuniones</h2><p>No se pudo cargar la agenda.</p><button type="button">Reintentar cargar agenda</button>';root.querySelector('button').onclick=renderMiniAgenda;}
}
export async function renderCommissions(){
  const root=document.querySelector('#view-comisiones');
  if(root.dataset.ready)return;
  root.innerHTML='<p role="status">Cargando historial de comisiones…</p>';
  try{
    const data=await load(),rows=eligible(data.reuniones);
    const years=[...new Set(rows.filter(r=>r.fecha<=localNow().slice(0,10)).map(r=>r.fecha.slice(0,4)))].sort().reverse();
    const names=[...new Map(rows.map(r=>[r.agrupacion,r.nombre_comision])).entries()].sort((a,b)=>a[1].localeCompare(b[1],'es'));
    root.innerHTML=`<header class="commission-intro"><h2>El trabajo en comisiones</h2><p>Cuántas reuniones se convocan y qué viene en la agenda.</p></header><p class="note">Convocatorias publicadas de diputados y asesores, incluidas comisiones especiales y Labor Parlamentaria. La agenda no confirma realización ni asistencia.</p>
      <figure class="commission-activity"><figcaption><h3>Actividad mensual de todas las comisiones</h3><p class="note">Convocatorias de diputados y asesores · todo el ciclo · último mes parcial</p></figcaption><div id="commission-activity-line"></div><details class="commission-activity-data"><summary>Ver valores mensuales</summary><div class="table-scroll"><table><thead><tr><th scope="col">Mes</th><th scope="col">Convocatorias</th></tr></thead><tbody id="commission-activity-values"></tbody></table></div></details></figure>
      <div class="section-tools commission-filters"><label>Período estadístico<select id="commission-year"><option value="all">Todo el ciclo</option>${years.map(y=>`<option>${y}</option>`).join('')}</select></label><label>Tipo de reunión<select id="commission-type"><option value="all">Diputados y asesores</option><option value="1">Diputados</option><option value="2">Asesores</option></select></label><label>Comisión<select id="commission-name"><option value="all">Todas las comisiones</option>${names.map(([id,n])=>`<option value="${esc(id)}">${esc(pretty(n))}</option>`).join('')}</select></label></div>
      <p class="note" id="commission-capture"></p><p class="sr-only" role="status" id="commission-status"></p>
      <div class="commission-layout"><div><section aria-labelledby="commission-ranking-title"><h3 id="commission-ranking-title">Convocatorias por comisión</h3><p class="note">Una reunión por ID oficial. Atribución a la comisión principal publicada.</p><div id="commission-ranking" class="partner-bars commission-ranking-list"></div></section></div>
      <aside class="commission-next" aria-labelledby="commission-next-title"><h3 id="commission-next-title">Próximas reuniones</h3><p class="note">Según el tipo y la comisión elegidos, independientemente del período estadístico.</p><div id="commission-next"></div></aside></div>
      <section class="commission-history" aria-labelledby="commission-history-title"><h3 id="commission-history-title">Historial de convocatorias</h3><p class="note">Fechas pasadas de la agenda oficial. Abrí una convocatoria para ver sus notas y su registro de observación.</p><div id="commission-history"></div><button type="button" id="commission-more">Mostrar más convocatorias</button></section>
      <details class="commission-method"><summary>Cómo leer estos datos</summary><p>La carga comienza el ${date(data.desde)}. Las estadísticas incluyen convocatorias hasta la hora actual de Buenos Aires; las futuras aparecen en la agenda. Se excluyen actos protocolares, audiencias y actividades sin comisión identificada. Las comisiones especiales y Labor Parlamentaria sin ID de comisión se agrupan por el nombre publicado del originador. Las reuniones conjuntas se atribuyen a la comisión principal: no se suman a todas las participantes.</p><p>Los meses sin convocatorias registradas se muestran en cero dentro del período cubierto. El año en curso es parcial. Los nombres corresponden a cada publicación y no prueban continuidad institucional entre períodos. No se incluyen comisiones sin ninguna convocatoria observada.</p><p>Un detalle diario está vacío en la primera carga; su convocatoria se conserva desde el calendario mensual, con la limitación señalada en el registro. El historial de cambios empieza con la primera captura. Se conservan versiones y observaciones en SQLite; una ausencia posterior no se interpreta como cancelación. Los registros que dejaron de aparecer en un rango actualizado se conservan en la base y quedan fuera de estas estadísticas.</p><p>Fuente: ${source}. Los temarios completos están enlazados en cada convocatoria.</p></details>`;
    let limit=20;
    const q=s=>root.querySelector(s);
    const totalMonths=monthly(historical(data.reuniones,{year:'all'}),'all',data.desde.slice(0,7),[data.hasta.slice(0,7),localNow().slice(0,7)].sort()[0]);
    const line=q('#commission-activity-line');
    const observer=new ResizeObserver(()=>activityLine(line,totalMonths));
    observer.observe(line);
    activityLine(line,totalMonths);
    q('#commission-activity-values').innerHTML=totalMonths.map(m=>`<tr><th scope="row">${esc(new Date(m.month+'-15T12:00:00').toLocaleDateString('es-AR',{month:'long',year:'numeric'}))}</th><td>${m.count}</td></tr>`).join('');
    if(years.length)q('#commission-year').value=years[0];
    q('#commission-capture').textContent=`Captura: ${new Date(data.actualizado).toLocaleString('es-AR',{timeZone:'America/Argentina/Buenos_Aires',hour12:false})}. Cobertura: ${date(data.desde)} — ${date(data.hasta)}.`;
    function draw(){
      const filters={year:q('#commission-year').value,type:q('#commission-type').value,commission:q('#commission-name').value};
      const past=historical(data.reuniones,filters),groups=ranking(past),max=Math.max(1,...groups.map(g=>g.total));
      q('#commission-status').textContent=`${past.length} ${past.length===1?'convocatoria':'convocatorias'} en ${groups.length} ${groups.length===1?'comisión':'comisiones'}.`;
      q('#commission-ranking').innerHTML=groups.length?groups.map(g=>`<div class="profile-partner" role="img" style="--shared-ratio:${g.total/max};--shared-color:#667570" aria-label="${esc(pretty(g.name))}: ${g.total} ${g.total===1?'convocatoria':'convocatorias'}, ${g.deputies} de diputados y ${g.advisors} de asesores"><span>${esc(pretty(g.name))}</span><span>${g.total}</span></div>`).join(''):'<p>No hay convocatorias para estos filtros. Probá otro período o comisión.</p>';
      q('#commission-next').innerHTML=agenda(data,filters);
      q('#commission-history').innerHTML=past.slice(0,limit).map(r=>`<details class="commission-record"><summary><time>${esc(date(r.fecha))} · ${esc(r.hora)}</time><span>${esc(pretty(r.nombre_comision))}</span><small>${r.tipo_id==='1'?'Diputados':'Asesores'}</small></summary><div><p>${esc(pretty(r.salon))} · ${esc(r.ubicacion)}</p>${r.detalle_incompleto?'<p class="note">El detalle diario está vacío; se conserva la convocatoria del calendario mensual.</p>':''}${r.notas?`<p class="commission-notes">${esc(r.notas)}</p>`:''}<p><a href="${esc(r.url)}" target="_blank" rel="noopener">Ver convocatoria y temario oficial ↗</a></p><p class="note">Primera observación: ${date(r.primera_observacion.slice(0,10))}. Última: ${date(r.ultima_observacion.slice(0,10))}. ${r.versiones} ${r.versiones===1?'versión registrada':'versiones registradas'}.</p></div></details>`).join('')||'<p>No hay convocatorias pasadas en esta selección.</p>';
      q('#commission-more').hidden=past.length<=limit;
    }
    root.querySelectorAll('select').forEach(s=>s.addEventListener('change',()=>{limit=20;draw();}));
    q('#commission-more').onclick=()=>{limit+=20;draw();};
    draw();root.dataset.ready='1';
  }catch(error){console.error(error);root.innerHTML='<h2>Comisiones</h2><p role="status">No se pudo cargar el historial. Revisá la conexión y volvé a intentarlo.</p><button type="button">Reintentar cargar comisiones</button>';root.querySelector('button').onclick=renderCommissions;}
}
