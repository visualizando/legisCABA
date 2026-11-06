export const CSV_URL='https://raw.githubusercontent.com/rusosnith/ScrapperTown/refs/heads/main/sesiones_legislatura.csv';
export function buenosAiresToday(now=new Date()){
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Argentina/Buenos_Aires',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
  return ['year','month','day'].map(k=>parts.find(p=>p.type===k).value).join('-');
}
// Compare calendar month/day, not day-of-year: leap years must not shift March–December.
export const calendarDay=date=>Date.UTC(2020,Number(date.slice(5,7))-1,Number(date.slice(8,10)));
export function normalizeSessions(rows){
  if(!rows.length)throw Error('CSV de sesiones vacío');
  const unique=new Map();
  for(const r of rows){
    if(!r.id_sesion_lp||!/^\d{4}-\d{2}-\d{2}$/.test(r.fecha||'')||!r.dsc_sesion_tipo?.trim())throw Error('Formato de sesiones inesperado');
    const parsed=new Date(r.fecha+'T00:00:00Z');
    if(!Number.isFinite(+parsed)||parsed.toISOString().slice(0,10)!==r.fecha)throw Error('Fecha de sesión inválida');
    const row={id:String(r.id_sesion_lp),date:r.fecha,year:Number(r.fecha.slice(0,4)),type:r.dsc_sesion_tipo.trim(),parliamentaryYear:Number(r.ano_parlamentario),day:calendarDay(r.fecha)};
    if(unique.has(row.id)&&JSON.stringify(unique.get(row.id))!==JSON.stringify(row))throw Error('ID de sesión con datos contradictorios');
    unique.set(row.id,row);
  }
  return [...unique.values()].sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));
}
export function annualCounts(rows,{today=buenosAiresToday(),mode='total',type='all',years}={}){
  const domain=years||[...new Set(rows.map(r=>r.year))].sort((a,b)=>a-b);
  const result=new Map(domain.map(year=>[year,{year,total:0,types:{}}]));
  for(const r of rows){
    if(r.date>today||type!=='all'&&r.type!==type||mode==='today'&&r.date.slice(5)>today.slice(5))continue;
    const group=result.get(r.year);if(!group)continue;
    group.total++;group.types[r.type]=(group.types[r.type]||0)+1;
  }
  return [...result.values()];
}
export function cumulativeSessions(rows,{today=buenosAiresToday(),type='all'}={}){
  const years=[...new Set(rows.map(r=>r.year))].sort((a,b)=>a-b);
  return years.map(year=>{
    const selected=rows.filter(r=>r.year===year&&r.date<=today&&(type==='all'||r.type===type));
    const days=new Map();for(const r of selected)days.set(r.day,(days.get(r.day)||0)+1);
    let count=0;const points=[{day:Date.UTC(2020,0,1),count:0}];
    for(const [day,n] of [...days].sort((a,b)=>a[0]-b[0]))points.push({day,count:count+=n});
    const end=year===Number(today.slice(0,4))?calendarDay(today):Date.UTC(2020,11,31);
    if(points.at(-1).day<end)points.push({day:end,count});
    return {year,total:count,points};
  });
}
