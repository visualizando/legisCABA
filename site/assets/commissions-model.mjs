export function localNow(now=new Date()){
  const parts=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Argentina/Buenos_Aires',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now);
  const get=t=>parts.find(p=>p.type===t).value;
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}
export function eligible(rows,{type='all',commission='all'}={}){
  return rows.map(r=>{
    const named=!r.comision_id&&(/^Comisión Especial\b/i.test(r.originador||'')||r.originador==='Labor Parlamentaria');
    return {...r,agrupacion:r.comision_id||(named?`originador:${r.originador}`:''),nombre_comision:r.comision||r.originador||''};
  }).filter(r=>r.presente&&r.agrupacion&&['1','2'].includes(r.tipo_id)&&(type==='all'||r.tipo_id===type)&&(commission==='all'||r.agrupacion===commission));
}
export function historical(rows,filters={},now=new Date()){
  const cutoff=localNow(now);
  return eligible(rows,filters).filter(r=>`${r.fecha}T${r.hora||'23:59'}`<cutoff&&(filters.year==='all'||!filters.year||r.fecha.startsWith(filters.year)))
    .sort((a,b)=>`${b.fecha}T${b.hora}`.localeCompare(`${a.fecha}T${a.hora}`)||a.id.localeCompare(b.id));
}
export function upcoming(rows,filters={},now=new Date()){
  const cutoff=localNow(now);
  return eligible(rows,filters).filter(r=>`${r.fecha}T${r.hora||'00:00'}`>=cutoff)
    .sort((a,b)=>`${a.fecha}T${a.hora}`.localeCompare(`${b.fecha}T${b.hora}`)||a.id.localeCompare(b.id));
}
export function ranking(rows){
  const groups=new Map();
  for(const r of rows){
    const key=r.agrupacion||r.comision_id;
    const g=groups.get(key)||{id:key,name:r.nombre_comision||r.comision,deputies:0,advisors:0,ids:new Set()};
    if(!g.ids.has(r.id)){g.ids.add(r.id);if(r.tipo_id==='1')g.deputies++;else g.advisors++;}
    groups.set(key,g);
  }
  return [...groups.values()].map(g=>({...g,total:g.ids.size})).sort((a,b)=>b.total-a.total||a.name.localeCompare(b.name,'es'));
}
export function monthly(rows,year,from,to){
  const counts=new Map();
  for(const r of rows){const key=r.fecha.slice(0,7);counts.set(key,(counts.get(key)||0)+1);}
  let keys=year!=='all'?Array.from({length:12},(_,i)=>`${year}-${String(i+1).padStart(2,'0')}`):[...counts.keys()].sort();
  if(year==='all'&&from&&to){keys=[];let cursor=from;while(cursor<=to){keys.push(cursor);const [y,m]=cursor.split('-').map(Number);cursor=`${m===12?y+1:y}-${String(m===12?1:m+1).padStart(2,'0')}`;}}
  return keys.map(month=>({month,count:counts.get(month)||0}));
}
