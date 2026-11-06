import {CSV_URL,normalizeSessions,buenosAiresToday,calendarDay,annualCounts,cumulativeSessions} from './sessions-model.mjs';
import {loadingMarkup} from './loading.mjs';

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pretty=s=>s.toLocaleLowerCase('es-AR').replace(/^./,c=>c.toLocaleUpperCase('es-AR'));
const date=s=>new Date(s+'T12:00:00Z').toLocaleDateString('es-AR',{timeZone:'UTC',day:'numeric',month:'long',year:'numeric'});
const highlightedYearColor='#f04438';
const mandatePeriods=[
  {start:2000,names:['Ibarra']},
  {start:2004,names:['Telerman']},
  {start:2008,names:['M. Macri']},
  {start:2012,names:['M. Macri']},
  {start:2016,names:['Larreta']},
  {start:2020,names:['Larreta']},
  {start:2024,names:['J. Macri']}
];
const month=new Intl.DateTimeFormat('es-AR',{month:'short',timeZone:'UTC'});
// Observable Plot's default categorical palette; its inferred string domain is sorted.
const colors=['#4269d0','#efb118','#ff725c','#6cc5b0','#3ca951','#ff8ab7','#a463f2','#97bbf5','#9c6b4e','#9498a0'];
let pending,redraw;
async function load(){
  if(!pending)pending=(async()=>{
    try{
      const response=await fetch(CSV_URL,{cache:'no-cache',signal:AbortSignal.timeout(8000)});
      if(!response.ok)throw Error('CSV no disponible');
      const rows=normalizeSessions(d3.csvParse((await response.text()).replace(/^\uFEFF/,'')));
      return {rows,live:true};
    }catch{
      const response=await fetch('data/sesiones.json',{cache:'no-cache',signal:AbortSignal.timeout(8000)});
      if(!response.ok)throw Error('Respaldo no disponible');
      const snapshot=await response.json();
      return {rows:normalizeSessions(snapshot.rows),live:false,captured:snapshot.captured_at};
    }
  })().catch(e=>{pending=null;throw e;});
  return pending;
}
function svgFor(root,height,label,minWidth=280){
  root.replaceChildren();
  const width=Math.max(minWidth,root.clientWidth);
  const svg=d3.select(root).append('svg').attr('viewBox',`0 0 ${width} ${height}`).attr('role','img').attr('aria-label',label);
  svg.append('title').text(label);return {svg,width};
}
function yearAxis(svg,y,x=40){svg.append('g').attr('transform',`translate(${x},0)`).call(d3.axisLeft(y).tickSize(0).tickPadding(9).tickFormat(d3.format('d')));}
function timeAxis(svg,x,y){svg.append('g').attr('transform',`translate(0,${y})`).call(d3.axisTop(x).ticks(d3.utcMonth.every(x.range()[1]<500?2:1)).tickFormat(d=>month.format(d)).tickSize(0).tickPadding(8));}
function totalsTable(rows,types){
  return `<div class="table-scroll"><table><thead><tr><th scope="col">Año</th>${types.map(t=>`<th scope="col">${esc(pretty(t))}</th>`).join('')}<th scope="col">Total</th></tr></thead><tbody>${[...rows].reverse().map(r=>`<tr><th scope="row">${r.year}</th>${types.map(t=>`<td>${r.types[t]||0}</td>`).join('')}<td>${r.total}</td></tr>`).join('')}</tbody></table></div>`;
}
export async function renderSessions(){
  const root=document.querySelector('#view-sesiones');
  if(root.dataset.ready){redraw?.();return;}
  if(root.dataset.loading)return;
  root.dataset.loading='1';root.innerHTML=`<div class="sessions-monitor"><h2>Monitor de sesiones</h2>${loadingMarkup('chart','Cargando sesiones…')}</div>`;
  try{
    const data=await load(),today=buenosAiresToday(),current=Number(today.slice(0,4));
    const rows=data.rows.filter(r=>r.date<=today),years=[...new Set(rows.map(r=>r.year))].sort((a,b)=>a-b);
    const types=[...new Set(rows.map(r=>r.type))].sort((a,b)=>rows.filter(r=>r.type===b).length-rows.filter(r=>r.type===a).length);
    const color=d3.scaleOrdinal(types.slice().sort(d3.ascending),colors),latest=rows.at(-1)?.date;
    root.innerHTML=`<div class="sessions-monitor"><header><h2>Monitor de sesiones</h2><p>Cuándo sesiona la Legislatura porteña y cómo cambia su actividad desde ${years[0]}.</p><p class="note" id="sessions-source"></p></header>
      <div class="section-tools"><label>Tipo de sesión<select id="session-type"><option value="all">Todos los tipos</option>${types.map(t=>`<option value="${esc(t)}">${esc(pretty(t))}</option>`).join('')}</select></label><label>Año destacado<select id="session-highlight">${[...years].reverse().map(y=>`<option value="${y}">${y}</option>`).join('')}</select></label></div>
      <figure><figcaption><h3>Cada punto es una sesión</h3><p>Fecha y tipo de sesión, ordenados por año calendario. La línea marca el ${date(today).replace(/ de \d{4}$/,'')}.</p></figcaption><div id="sessions-legend" class="sessions-legend"></div><div id="sessions-calendar" class="sessions-chart"></div><p id="sessions-calendar-readout" class="session-readout">Recorré el calendario para ver las fechas.</p><details><summary>Ver fechas y enlaces oficiales</summary><div id="sessions-records" class="table-scroll"></div></details></figure>
      <figure><figcaption><h3>El ritmo de cada año</h3><p>Sesiones acumuladas desde el 1 de enero. El año elegido se destaca en rojo; los grises van del más claro (años antiguos) al más oscuro (recientes).</p></figcaption><div id="sessions-years-legend" class="sessions-legend"></div><div id="sessions-cumulative" class="sessions-chart"></div><p id="sessions-cumulative-readout" class="session-readout">Seleccioná una trayectoria o recorré el gráfico para comparar.</p></figure>
      <figure><figcaption><h3>Cuántas sesiones hubo por año</h3><p>Totales anuales; en amarillo desde 2008 (gobiernos del PRO). El año actual está en curso y el primer año de la serie puede ser parcial. Los números indican el máximo de cada período.</p></figcaption><div id="sessions-annual" class="sessions-chart session-annual-scroll"></div><details><summary>Ver totales anuales</summary><div id="sessions-annual-table"></div></details></figure>
      <figure><figcaption><h3>Sesiones por año y tipo</h3><p id="sessions-comparison-note"></p></figcaption><div class="sort-controls" role="group" aria-label="Período de comparación"><button type="button" data-session-mode="total" aria-pressed="false">Total del año</button><button type="button" data-session-mode="today" aria-pressed="true">Hasta el ${date(today).replace(/ de \d{4}$/,'')} de cada año</button></div><div id="sessions-bars-legend" class="sessions-legend"></div><div id="sessions-bars" class="sessions-chart"></div><p id="sessions-comparison-status" class="sr-only" role="status"></p><div id="sessions-bars-table" class="sr-only"></div></figure>
      <details class="session-method"><summary>Fuente y criterios</summary><p>Fuente: <a href="https://github.com/rusosnith/ScrapperTown" target="_blank" rel="noopener">ScrapperTown, de @rusosnith ↗</a>, que obtiene los registros públicos de la Legislatura mediante <a href="https://github.com/rusosnith/ScrapperTown/blob/main/scrape_sesiones.py" target="_blank" rel="noopener">su recolector de sesiones ↗</a>. <a href="${CSV_URL}" target="_blank" rel="noopener">Descargar CSV ↗</a>. Gráficos adaptados del <a href="https://observablehq.com/@rusosnith/sesiones-legislatura-caba" target="_blank" rel="noopener">notebook original ↗</a>.</p><p>El <a href="https://github.com/rusosnith/ScrapperTown/blob/main/.github/workflows/scraper_sesiones.yml" target="_blank" rel="noopener">workflow de origen ↗</a> está programado para el día 1 de cada mes a las 06:00 de Buenos Aires y admite ejecución manual. Su actualización automática consulta desde la última fecha guardada y conserva el histórico; no vuelve a consultar los años anteriores para detectar correcciones o publicaciones tardías.</p><p>Se cuenta una vez cada ID de sesión y se agrupa por el año calendario de la fecha, que puede diferir del año parlamentario. Se excluyen fechas futuras. Hasta hoy compara el mismo día y mes en todos los años, incluido el 29 de febrero cuando corresponde; no se desplaza el corte en años bisiestos.</p><p>La serie anual se divide en los cortes de cuatro años indicados en el eje. Los nombres identifican los gobiernos de cada período calendario; 2004–2007 incluye a Ibarra y Telerman, quien asumió en 2006. No son fechas exactas de asunción.</p><p>El acumulado cuenta sesiones por fecha, sin suavizar ni agrupar en intervalos. Los años y tipos sin sesiones conservan su valor cero. Una fecha con varios registros puede mostrar puntos superpuestos. La ausencia de registros no demuestra ausencia de actividad; el CSV no certifica cobertura completa.</p><p>La sección consulta directamente el CSV de ScrapperTown y usa una copia local si la descarga falla. La última sesión registrada no es la fecha de actualización del scraper.</p></details></div>`;
    const q=s=>root.querySelector(s);let mode='today';
    q('#session-highlight').value=String(years.includes(current)?current:years.at(-1));
    q('#sessions-source').textContent=`${data.live?'CSV de ScrapperTown consultado al abrir esta sección.':`Copia de respaldo capturada el ${date(data.captured.slice(0,10))}; no se pudo consultar el CSV en vivo.`} Última sesión registrada: ${date(latest)}.`;
    const legend=types.map(t=>`<span><i style="background:${color(t)}" aria-hidden="true"></i>${esc(pretty(t))}</span>`).join('');
    q('#sessions-legend').innerHTML=legend;q('#sessions-bars-legend').innerHTML=legend;
    function draw(){
      if(root.hidden||!root.clientWidth)return;
      const type=q('#session-type').value,highlight=Number(q('#session-highlight').value),selected=rows.filter(r=>type==='all'||r.type===type);
      const totals=annualCounts(rows,{today,type,years}),comparison=annualCounts(rows,{today,type,mode,years});
      // Calendar: a shared leap-year axis preserves month/day across all years.
      {
        const h=years.length*23+68,{svg,width}=svgFor(q('#sessions-calendar'),h,'Sesiones por fecha y año; detalle disponible en la tabla siguiente');
        const x=d3.scaleUtc().domain([Date.UTC(2020,0,1),Date.UTC(2020,11,31)]).range([46,width-8]);
        const y=d3.scalePoint(years.slice().reverse(),[56,h-14]);
        for(const year of years)svg.append('line').attr('x1',46).attr('x2',width-8).attr('y1',y(year)).attr('y2',y(year)).attr('stroke','#eceeea');
        timeAxis(svg,x,42);yearAxis(svg,y,40);
        svg.append('line').attr('x1',x(calendarDay(today))).attr('x2',x(calendarDay(today))).attr('y1',18).attr('y2',h-4).attr('stroke','#b43e2c').attr('stroke-dasharray','4 3');
        svg.append('text').attr('x',Math.max(60,Math.min(width-20,x(calendarDay(today))))).attr('y',12).attr('text-anchor','middle').attr('class','session-label session-current').text('HOY');
        const dots=svg.append('g').selectAll('circle').data(selected).join('circle').attr('cx',r=>x(r.day)).attr('cy',r=>y(r.year)).attr('r',3.4).attr('fill',r=>color(r.type));
        dots.append('title').text(r=>`${date(r.date)} · ${pretty(r.type)}`);
        if(selected.length){
          const nearest=d3.Delaunay.from(selected,r=>x(r.day),r=>y(r.year));
          svg.append('rect').attr('x',46).attr('y',47).attr('width',width-54).attr('height',h-47).attr('fill','transparent').on('pointermove',function(event){const [mx,my]=d3.pointer(event,this);const r=selected[nearest.find(mx,my)];q('#sessions-calendar-readout').textContent=`${date(r.date)} · ${pretty(r.type)} · Sesión ${r.id}`;});
        }
        q('#sessions-records').innerHTML=`<table><thead><tr><th scope="col">Fecha</th><th scope="col">Tipo</th><th scope="col">Sesión</th></tr></thead><tbody>${[...selected].reverse().map(r=>`<tr><th scope="row">${date(r.date)}</th><td>${esc(pretty(r.type))}</td><td><a target="_blank" rel="noopener" href="https://www.legislatura.gob.ar/InfoSesion/${encodeURIComponent(r.id)}">${esc(r.id)} ↗</a></td></tr>`).join('')}</tbody></table>`;
      }
      {
        const series=cumulativeSessions(rows,{today,type}),h=460,{svg,width}=svgFor(q('#sessions-cumulative'),h,'Sesiones acumuladas por año. Recorré las líneas o enfocalas con el teclado para identificar cada año.');
        svg.attr('role','group');
        const right=width-50;
        const x=d3.scaleUtc().domain([Date.UTC(2020,0,1),Date.UTC(2020,11,31)]).range([38,right]);
        const y=d3.scaleLinear().domain([0,d3.max(series,r=>r.total)||1]).nice().range([h-34,24]);
        const greys=d3.scaleLinear().domain(d3.extent(years)).range([.25,.85]);
        const historical=years.filter(year=>year!==highlight),first=historical[0],last=historical.at(-1);
        q('#sessions-years-legend').innerHTML=`<span><i class="session-years-ramp" style="background:linear-gradient(to right,${d3.interpolateGreys(greys(first))},${d3.interpolateGreys(greys(last))})" aria-hidden="true"></i>${first} → ${last}</span><span><i class="session-line-key" style="border-color:${highlightedYearColor}" aria-hidden="true"></i>Año destacado: ${highlight}</span>`;
        const stroke=s=>s.year===highlight?highlightedYearColor:d3.interpolateGreys(greys(s.year));
        svg.append('g').attr('transform','translate(38,0)').call(d3.axisLeft(y).ticks(6).tickSize(-(right-38)).tickFormat(d3.format('d')));
        svg.append('g').attr('transform',`translate(0,${h-34})`).call(d3.axisBottom(x).ticks(d3.utcMonth.every(width<500?2:1)).tickFormat(d=>month.format(d)));
        const line=d3.line().x(p=>x(p.day)).y(p=>y(p.count)).curve(d3.curveStepAfter);
        const paths=svg.append('g').selectAll('path').data(series.filter(s=>s.year!==highlight).concat(series.filter(s=>s.year===highlight))).join('path').attr('d',s=>line(s.points)).attr('fill','none').attr('stroke',stroke).attr('stroke-width',s=>s.year===highlight?3.5:1.2).attr('tabindex',0).attr('class','session-focus').attr('aria-label',s=>`${s.year}: ${s.total} sesiones`);
        const leader=svg.append('line').attr('stroke-dasharray','3 3').attr('stroke-width',1).attr('pointer-events','none');
        const yearLabel=svg.append('text').attr('x',right+7).attr('class','session-label session-value').attr('dy','.35em').attr('pointer-events','none');
        const chosen=series.find(s=>s.year===highlight);
        function showYear(s){
          const end=s.points.at(-1);
          leader.attr('x1',x(end.day)).attr('x2',right+3).attr('y1',y(end.count)).attr('y2',y(end.count)).attr('stroke',stroke(s));
          yearLabel.attr('y',y(end.count)).attr('fill',s.year===highlight?highlightedYearColor:'#202726').text(s.year);
        }
        function activate(s){
          paths.attr('opacity',r=>r.year===s.year||r.year===highlight?1:.2).attr('stroke-width',r=>r.year===highlight?(r.year===s.year?4.5:3.5):r.year===s.year?3:1.2);
          showYear(s);
          q('#sessions-cumulative-readout').textContent=`${s.year}: ${s.total} sesiones${s.year===current?' hasta hoy':''}.`;
        }
        function reset(){
          paths.attr('opacity',1).attr('stroke-width',s=>s.year===highlight?3.5:1.2);
          if(chosen)showYear(chosen);
          q('#sessions-cumulative-readout').textContent='Seleccioná una trayectoria o recorré el gráfico para comparar.';
        }
        paths.on('focus',(_,s)=>activate(s)).on('blur',reset);
        // Sample both legs of each step: picking stays close to the visible line, even on touch.
        const samples=[];
        function sampleSegment(ax,ay,bx,by,s){
          const n=Math.max(1,Math.ceil(Math.hypot(bx-ax,by-ay)/5));
          for(let i=0;i<=n;i++)samples.push({x:ax+(bx-ax)*i/n,y:ay+(by-ay)*i/n,series:s});
        }
        for(const s of series)for(let i=1;i<s.points.length;i++){
          const a=s.points[i-1],b=s.points[i];
          sampleSegment(x(a.day),y(a.count),x(b.day),y(a.count),s);
          sampleSegment(x(b.day),y(a.count),x(b.day),y(b.count),s);
        }
        if(samples.length){
          const nearest=d3.Delaunay.from(samples,p=>p.x,p=>p.y);
          svg.append('rect').attr('x',38).attr('y',24).attr('width',right-38).attr('height',h-58).attr('fill','transparent').on('pointermove',function(event){const [mx,my]=d3.pointer(event,this);activate(samples[nearest.find(mx,my)].series);}).on('pointerleave',reset);
        }
        reset();
      }
      {
        const h=320,{svg,width}=svgFor(q('#sessions-annual'),h,'Cantidad total de sesiones por año, con cortes por período de gobierno y máximos de cada período.',680);
        const x=d3.scaleLinear().domain(d3.extent(years)).range([20,width-24]),y=d3.scaleLinear().domain([0,d3.max(totals,r=>r.total)||1]).nice().range([h-32,80]);
        const periods=mandatePeriods.filter(p=>p.start>=years[0]&&p.start<=years.at(-1));
        const defs=svg.append('defs'),boundary=Math.max(20,Math.min(width-24,x(2008)));
        defs.append('clipPath').attr('id','sessions-before-pro').append('rect').attr('x',0).attr('y',0).attr('width',boundary).attr('height',h);
        defs.append('clipPath').attr('id','sessions-since-pro').append('rect').attr('x',boundary).attr('y',0).attr('width',width-boundary).attr('height',h);
        const area=d3.area().x(r=>x(r.year)).y0(y(0)).y1(r=>y(r.total)).curve(d3.curveMonotoneX);
        const annualLine=d3.line().x(r=>x(r.year)).y(r=>y(r.total)).curve(d3.curveMonotoneX);
        for(const [clip,fill,stroke] of [['sessions-before-pro','#eef0ec','#727a77'],['sessions-since-pro','#fff4ce','#efb118']]){
          svg.append('path').datum(totals).attr('clip-path',`url(#${clip})`).attr('fill',fill).attr('d',area);
          svg.append('path').datum(totals).attr('clip-path',`url(#${clip})`).attr('fill','none').attr('stroke',stroke).attr('stroke-width',2.5).attr('d',annualLine);
        }
        const markers=svg.append('g').attr('class','session-mandates');
        for(const period of periods){
          markers.append('line').attr('x1',x(period.start)).attr('x2',x(period.start)).attr('y1',26).attr('y2',h-32).attr('stroke','#d8dcd6');
          const label=markers.append('text').attr('x',x(period.start)+5).attr('y',18).attr('fill','#596461');
          period.names.forEach((name,i)=>label.append('tspan').attr('x',x(period.start)+5).attr('dy',i?'1.2em':0).text(name));
        }
        svg.append('g').attr('transform',`translate(0,${h-32})`).call(d3.axisBottom(x).tickValues(periods.map(p=>p.start)).tickFormat(d3.format('d')).tickSize(0).tickPadding(10));
        svg.selectAll('circle').data(totals).join('circle').attr('cx',r=>x(r.year)).attr('cy',r=>y(r.total)).attr('r',r=>r.year===highlight?5:3).attr('fill',r=>r.year>=2008?'#efb118':'#727a77').append('title').text(r=>`${r.year}: ${r.total} sesiones`);
        const starts=[years[0],...periods.map(p=>p.start)].filter((year,i,all)=>all.indexOf(year)===i);
        const peaks=starts.map((start,i)=>totals.filter(r=>r.year>=start&&r.year<(starts[i+1]??Infinity)).reduce((best,r)=>!best||r.total>best.total?r:best,null)).filter(Boolean);
        const peakLabels=svg.append('g').attr('class','session-period-peaks');
        for(const peak of peaks)peakLabels.append('text').attr('x',x(peak.year)).attr('y',y(peak.total)-11).attr('text-anchor','middle').attr('class','session-label session-value').text(peak.total).append('title').text(`${peak.year}: máximo del período, ${peak.total} sesiones`);
        const chosen=totals.find(r=>r.year===highlight);
        if(chosen&&!peaks.some(p=>p.year===chosen.year))svg.append('text').attr('x',x(chosen.year)).attr('y',y(chosen.total)-12).attr('text-anchor',chosen.year===years.at(-1)?'end':chosen.year===years[0]?'start':'middle').attr('class','session-label session-value').text(`${chosen.year}: ${chosen.total}`);
        q('#sessions-annual-table').innerHTML=totalsTable(totals,[]);

      }
      {
        const h=years.length*26+45,{svg,width}=svgFor(q('#sessions-bars'),h,'Sesiones por año y tipo');
        const x=d3.scaleLinear().domain([0,d3.max(comparison,r=>r.total)||1]).nice().range([46,width-36]),y=d3.scaleBand(years.slice().reverse(),[30,h-8]).padding(.25);
        svg.append('g').attr('transform','translate(0,22)').call(d3.axisTop(x).ticks(width<500?4:8).tickFormat(d3.format('d')).tickSize(-(h-30)));
        yearAxis(svg,y,40);
        for(const r of comparison){
          let offset=0;for(const t of types){const n=r.types[t]||0;if(n)svg.append('rect').attr('x',x(offset)).attr('y',y(r.year)).attr('width',x(offset+n)-x(offset)).attr('height',y.bandwidth()).attr('fill',color(t)).append('title').text(`${r.year} · ${pretty(t)}: ${n}`);offset+=n;}
          svg.append('text').attr('x',x(r.total)+5).attr('y',y(r.year)+y.bandwidth()/2).attr('dy','.35em').attr('class',r.year===highlight?'session-current':'session-value').text(r.total);
        }
        const note=mode==='today'?`Hasta el ${date(today).replace(/ de \d{4}$/,'')} de cada año.`:'Años completos según los registros disponibles; el año actual es parcial.';
        q('#sessions-comparison-note').textContent=note;q('#sessions-comparison-status').textContent=note;
        q('#sessions-bars-table').innerHTML=totalsTable(comparison,types);
      }
    }
    root.querySelectorAll('select').forEach(s=>s.addEventListener('change',draw));
    root.querySelectorAll('[data-session-mode]').forEach(b=>b.onclick=()=>{mode=b.dataset.sessionMode;root.querySelectorAll('[data-session-mode]').forEach(btn=>btn.setAttribute('aria-pressed',String(btn===b)));draw();});
    redraw=draw;root.dataset.ready='1';draw();
  }catch(error){console.error(error);root.innerHTML='<div class="sessions-monitor"><h2>Monitor de sesiones</h2><p role="status">No se pudieron cargar las sesiones. Revisá la conexión y volvé a intentarlo.</p><button type="button">Reintentar cargar sesiones</button></div>';root.querySelector('button').onclick=renderSessions;
  }finally{delete root.dataset.loading;}
}
let timer;window.addEventListener('resize',()=>{clearTimeout(timer);timer=setTimeout(()=>redraw?.(),150);});
