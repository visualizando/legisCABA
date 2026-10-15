const choices = new Set(['AFIRMATIVO','NEGATIVO','ABSTENCIÓN']);
export function majority(votes){
  const emitted=votes.filter(v=>choices.has(v.voto));
  for(const value of choices)if(emitted.filter(v=>v.voto===value).length>emitted.length/2)return value;
  return null;
}

// Each emitted individual vote has equal weight. Non-votes never count as disagreement.
export const blockKey=(data,id,grouped=true)=>grouped?(data.bloque_trayectoria?.[id]||id):id;
export const blockName=(data,id,grouped=true)=>grouped?(data.trayectorias?.[id]?.nombre||data.bloques[id]):data.bloques[id];
export function filterBallots(data,{year='all',category='all',contested=false}={}){
  return data.votaciones.filter(b=>(year==='all'||b.fecha.startsWith(year))&&
    (category==='all'||(category==='sin-datos'?!b.categorias?.length:b.categorias?.includes(category)))&&
    (!contested||[b.positivos,b.negativos,b.abstenciones].filter(n=>n>0).length>1));
}
export function officialism(data,{year='all',category='all',reference=data.referencia_predeterminada,contested=false,grouped=true,activeIds=null}={}){
  const groups=new Map();let eligible=0,withoutReference=0,inconsistent=0;
  const ballots=filterBallots(data,{year,category,contested});
  for(const b of ballots){
    if(b.totales_consistentes===false){inconsistent++;continue;}
    const position=majority(b.votos.filter(v=>reference.includes(blockKey(data,v.bloque,grouped))));
    if(!position){withoutReference++;continue;}
    eligible++;
    for(const v of b.votos){
      if(!v.bloque)continue;
      if(activeIds&&!activeIds.has(v.legislador))continue;
      const key=blockKey(data,v.bloque,grouped);
      if(!groups.has(key))groups.set(key,{id:key,name:blockName(data,key,grouped),matches:0,total:0,nonvotes:0,ballots:new Set()});
      const g=groups.get(key);
      if(!choices.has(v.voto)){g.nonvotes++;continue;}
      g.total++;g.matches+=Number(v.voto===position);g.ballots.add(b.id);
    }
  }
  return {eligible,withoutReference,inconsistent,ballots:ballots.length,rows:[...groups.values()].map(g=>({...g,ballots:g.ballots.size,rate:g.total?g.matches/g.total:null})).sort((a,b)=>(b.rate??-1)-(a.rate??-1)||a.name.localeCompare(b.name,'es'))};
}

export function annualSeries(data,historic,options={}){
  const years=[...new Set(data.votaciones.map(v=>v.fecha.slice(0,4)))].sort();
  const reference=options.reference||data.referencia_predeterminada;
  const compatible=(options.category||'all')==='all'&&!options.contested&&!options.activeIds&&options.grouped!==false&&reference.every(id=>['119','86','83','7'].includes(id));
  const cutover=historic?Math.max(...historic.series.flatMap(s=>s.datos.map(([y])=>y)))+1:Number(years[0]);
  const series=new Map();
  for(const year of years){
    if(options.year&&options.year!=='all'&&options.year!==year)continue;
    if(compatible&&historic&&Number(year)<cutover)continue;
    for(const row of officialism(data,{...options,year}).rows){
      if(!series.has(row.id))series.set(row.id,{id:row.id,name:row.name,points:[]});
      if(row.rate!==null)series.get(row.id).points.push({year:Number(year),rate:row.rate,total:row.total,matches:row.matches,source:'oficial'});
    }
  }
  if(compatible&&historic){
    for(const h of historic.series){
      if(h.nombre==='Total')continue;
      const key=h.bloque_enlace?blockKey(data,h.bloque_enlace):h.id;
      const points=h.datos.filter(([year])=>year<cutover&&(!options.year||options.year==='all'||String(year)===options.year));
      if(!points.length)continue;
      if(!series.has(key))series.set(key,{id:key,name:blockName(data,key)||h.nombre,points:[]});
      series.get(key).points.push(...points.map(([year,rate])=>({year,rate,total:null,matches:null,source:'observable'})));
    }
  }
  return {compatible,cutover,series:[...series.values()].map(s=>({...s,points:s.points.sort((a,b)=>a.year-b.year)})).sort((a,b)=>a.name.localeCompare(b.name,'es'))};
}
