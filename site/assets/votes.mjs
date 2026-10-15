import {officialism} from './votes-model.mjs';
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>new Intl.NumberFormat('es-AR').format(n);
const percent=n=>n===null?'Sin votos':new Intl.NumberFormat('es-AR',{style:'percent',maximumFractionDigits:1}).format(n);
let data,loading=false,page=0;
const size=20;
export async function renderVotes(){
  if(data){render();return;}
  if(loading)return;
  loading=true;$('#votes-state').textContent='Consultando la base de votaciones…';
  try{
    const response=await fetch('data/votaciones.json',{cache:'no-cache'});
    if(!response.ok)throw new Error('No se pudo leer la base');
    data=await response.json();
    $('#votes-year').innerHTML='<option value="all">Todo el ciclo</option>'+[...new Set(data.votaciones.map(v=>v.fecha.slice(0,4)))].sort().reverse().map(y=>`<option>${y}</option>`).join('');
    $('#votes-reference').innerHTML=Object.entries(data.bloques).sort((a,b)=>a[1].localeCompare(b[1],'es')).map(([id,name])=>`<option value="${esc(id)}" ${data.referencia_predeterminada.includes(id)?'selected':''}>${esc(name)}</option>`).join('');
    ['#votes-year','#votes-reference','#votes-contested'].forEach(id=>$(id).addEventListener('change',()=>{page=0;render();}));
    $('#votes-search').addEventListener('input',()=>{page=0;renderList();});
    $('#votes-controls').hidden=false;$('#votes-content').hidden=false;
    render();
  }catch(error){
    $('#votes-state').innerHTML='No se pudo cargar la base de votos. <button type="button" id="votes-retry">Reintentar</button>';
    $('#votes-retry').addEventListener('click',renderVotes);
  }finally{loading=false;}
}
function filters(){return {year:$('#votes-year').value,reference:[$('#votes-reference').value],contested:$('#votes-contested').checked};}
function render(){
  const f=filters(),result=officialism(data,f),ref=data.bloques[f.reference[0]];
  $('#votes-state').textContent=`${fmt(data.resumen.votaciones)} votaciones nominales · ${fmt(data.resumen.votos)} registros individuales · ${data.resumen.sesiones_con_votos} de ${data.resumen.sesiones} sesiones con votos publicados · Consulta: ${new Date(data.actualizado).toLocaleDateString('es-AR')}`;
  $('#votes-subtitle').textContent=`Coincidencia con la mayoría de ${ref}. Cada voto afirmativo, negativo o abstención cuenta una vez.`;
  $('#votes-denominator').textContent=`${fmt(result.eligible)} votaciones comparables. ${fmt(result.withoutReference)} sin mayoría definida o sin votos emitidos del bloque de referencia.${result.inconsistent?` ${fmt(result.inconsistent)} excluidas por inconsistencias.`:''} “No votó” y votos sin bloque histórico quedan fuera del porcentaje.`;
  $('#votes-ranking').innerHTML=result.rows.length?result.rows.map(g=>`<div class="vote-rank ${f.reference.includes(g.id)?'vote-reference':''}"><div class="vote-rank-label"><strong>${esc(g.name)}</strong><span>${percent(g.rate)}</span></div><div class="vote-track" aria-hidden="true"><i style="width:${(g.rate??0)*100}%"></i></div><p>${fmt(g.matches)} de ${fmt(g.total)} votos coincidentes · ${fmt(g.ballots)} votaciones · ${fmt(g.nonvotes)} sin voto emitido</p></div>`).join(''):'<p class="empty">No hay votos comparables con estos filtros.</p>';
  const years=[...new Set(data.votaciones.map(v=>v.fecha.slice(0,4)))].sort();
  const annual=new Map(years.map(y=>[y,new Map(officialism(data,{...f,year:y}).rows.map(r=>[r.id,r]))]));
  $('#votes-years').innerHTML=`<div class="table-scroll"><table><caption>Coincidencia por año con ${esc(ref)} · independiente del filtro de año</caption><thead><tr><th scope="col">Bloque</th>${years.map(y=>`<th scope="col">${y}</th>`).join('')}</tr></thead><tbody>${[...new Set([...annual.values()].flatMap(m=>[...m.keys()]))].map(id=>`<tr><th scope="row">${esc(data.bloques[id])}</th>${years.map(y=>{const row=annual.get(y).get(id);return `<td>${row?percent(row.rate):'—'}</td>`;}).join('')}</tr>`).join('')}</tbody></table></div>`;
  $('#votes-quality').textContent=`Se conservan ${fmt(data.resumen.sin_bloque_historico)} registros sin bloque histórico identificable y ${fmt(data.resumen.recuentos_distintos_60)} votaciones con un recuento distinto de 60 personas. Son señales para revisión, no pruebas de error. Se excluyen del oficialómetro ${fmt(data.resumen.totales_inconsistentes)} votaciones cuyos detalles no concuerdan con los totales o tienen opciones contradictorias. La fuente puede publicar o corregir datos con demora; una sesión sin registros no prueba que no se haya votado.`;
  renderList();
}
function renderList(){
  const f=filters(),term=$('#votes-search').value.toLocaleLowerCase('es');
  const rows=data.votaciones.filter(b=>(f.year==='all'||b.fecha.startsWith(f.year))&&(!f.contested||[b.positivos,b.negativos,b.abstenciones].filter(n=>n>0).length>1)&&`${b.asunto} ${b.fecha}`.toLocaleLowerCase('es').includes(term)).sort((a,b)=>b.fecha.localeCompare(a.fecha)||Number(b.id)-Number(a.id));
  page=Math.min(page,Math.max(0,Math.ceil(rows.length/size)-1));
  $('#votes-list').innerHTML=`<div class="project-toolbar"><p>${fmt(rows.length)} votaciones</p><div class="pagination"><button id="votes-prev" type="button" ${page===0?'disabled':''} aria-label="Votaciones anteriores">←</button><span>${page+1} / ${Math.max(1,Math.ceil(rows.length/size))}</span><button id="votes-next" type="button" ${(page+1)*size>=rows.length?'disabled':''} aria-label="Votaciones siguientes">→</button></div></div>`+rows.slice(page*size,(page+1)*size).map(b=>`<details class="vote-detail"><summary><span>${esc(b.fecha)} · ${esc(b.asunto)}</span><small>${b.positivos} afirmativos · ${b.negativos} negativos · ${b.abstenciones} abstenciones</small></summary><p><a href="https://parlamentaria.legislatura.gob.ar/pages/sesion_votaciones.aspx?IdSesion=${encodeURIComponent(b.sesion)}" target="_blank" rel="noopener">Ver sesión oficial ↗</a> · Votación ${esc(b.id)}</p><div class="table-scroll"><table><thead><tr><th scope="col">Legislador/a</th><th scope="col">Bloque en la fecha</th><th scope="col">Voto</th><th scope="col">Presencia informada</th></tr></thead><tbody>${b.votos.map(v=>`<tr><td>${esc(data.legisladores[v.legislador])}</td><td>${esc(data.bloques[v.bloque]||'Sin bloque histórico identificado')}</td><td>${esc(v.voto)}</td><td>${esc(v.presencia)}</td></tr>`).join('')}</tbody></table></div></details>`).join('');
  $('#votes-prev').onclick=()=>{page--;renderList();};$('#votes-next').onclick=()=>{page++;renderList();};
}
