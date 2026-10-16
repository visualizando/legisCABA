// Tow treats non-participation as a position, not as a missing denominator.
// CABA labels that position NO VOTÓ; the independent presence field is preserved.
const choices=new Set(['AFIRMATIVO','NEGATIVO','ABSTENCIÓN','NO VOTÓ']);
export const expandVoteTypes=types=>[...new Set(types.flatMap(type=>type==='otros'?['resolucion','otros','sin-datos']:[type]))];
export function majority(votes){
  const counts=new Map();
  for(const v of votes)if(choices.has(v.voto))counts.set(v.voto,(counts.get(v.voto)||0)+1);
  const ranked=[...counts].sort((a,b)=>b[1]-a[1]);
  return ranked.length&&(!ranked[1]||ranked[0][1]>ranked[1][1])?ranked[0][0]:null;
}
export const blockKey=(data,id,grouped=true)=>grouped?(data.bloque_trayectoria?.[id]||id):id;
export const blockName=(data,id,grouped=true)=>grouped?(data.trayectorias?.[id]?.nombre||data.bloques[id]):data.bloques[id];
export function visibleBlockSeries(data,series){
  // Include historical and parallel blocs, not only today's six main names.
  const ids=['119','104','114','9',
    '41','87','25','44','84','108','118','124',
    '51','82','103','107','112','113','116'];
  const visible=new Set(ids.map(id=>blockKey(data,id,true)));
  return series.filter(s=>visible.has(blockKey(data,s.id,true)));
}
export function filterBallots(data,{year='all',category='all',types=null,contested=false}={}){
  return data.votaciones.filter(b=>(year==='all'||b.fecha.startsWith(year))&&
    (category==='all'||(category==='sin-datos'?!b.categorias?.length:b.categorias?.includes(category)))&&
    (types===null||(b.categorias?.length?b.categorias.some(c=>types.includes(c)):types.includes('sin-datos')))&&
    (!contested||[b.positivos,b.negativos,b.abstenciones].filter(n=>n>0).length>1));
}
export function officialism(data,{year='all',category='all',types=null,reference=data.referencia_predeterminada,contested=false,grouped=true,activeIds=null}={}){
  const groups=new Map();let eligible=0,withoutReference=0,inconsistent=0;
  const ballots=filterBallots(data,{year,category,types,contested});
  for(const b of ballots){
    if(b.totales_consistentes===false){inconsistent++;continue;}
    // Use the historical governing bloc, regardless of the display grouping/filter.
    const position=majority(b.votos.filter(v=>reference.includes(v.bloque)));
    if(position===null){withoutReference++;continue;}
    eligible++;
    for(const v of b.votos){
      if(!v.bloque||!v.legislador||!choices.has(v.voto)||activeIds&&!activeIds.has(v.legislador))continue;
      const key=blockKey(data,v.bloque,grouped);
      if(!groups.has(key))groups.set(key,{id:key,name:blockName(data,key,grouped),matches:0,total:0,nonvotes:0,ballots:new Set(),members:new Map()});
      const g=groups.get(key),match=Number(v.voto===position);
      g.total++;g.matches+=match;g.nonvotes+=Number(v.voto==='NO VOTÓ');g.ballots.add(b.id);
      if(!g.members.has(v.legislador))g.members.set(v.legislador,{id:v.legislador,matches:0,total:0});
      const member=g.members.get(v.legislador);member.total++;member.matches+=match;
    }
  }
  const rows=[...groups.values()].map(g=>{
    const individuals=[...g.members.values()].map(p=>({...p,rate:p.matches/p.total}));
    const {members,...rest}=g;
    return {...rest,ballots:g.ballots.size,people:individuals.length,individuals,
      rate:individuals.length?individuals.reduce((sum,p)=>sum+p.rate,0)/individuals.length:null};
  }).sort((a,b)=>(b.rate??-1)-(a.rate??-1)||a.name.localeCompare(b.name,'es'));
  return {eligible,withoutReference,inconsistent,ballots:ballots.length,rows};
}

export function compareOfficialism(data,options={}){
  const general=officialism(data,{...options,contested:false});
  const contested=officialism(data,{...options,contested:true});
  const byId=new Map(contested.rows.map(row=>[row.id,row]));
  return {general,contested,rows:general.rows.map(row=>({...row,contested:byId.get(row.id)||null}))};
}

// One source and one calculation for every year. Observable is only a comparison archive.
export function annualSeries(data,options={}){
  const years=[...new Set(data.votaciones.map(v=>v.fecha.slice(0,4)))].sort(),series=new Map();
  for(const year of years){
    if(options.year&&options.year!=='all'&&options.year!==year)continue;
    for(const row of officialism(data,{...options,year}).rows){
      if(!series.has(row.id))series.set(row.id,{id:row.id,name:row.name,points:[]});
      if(row.rate!==null)series.get(row.id).points.push({year:Number(year),rate:Math.round(row.rate*10000)/10000,
        total:row.total,matches:row.matches,people:row.people,source:'oficial'});
    }
  }
  return {series:[...series.values()].sort((a,b)=>a.name.localeCompare(b.name,'es'))};
}

// Keep a person's identity across bloc changes; each eligible vote counts once.
export function personAnnualSeries(data,personId,options={}){
  const series={id:`person:${personId}`,kind:'person',name:data.legisladores[personId],points:[]};
  if(options.activeIds&&!options.activeIds.has(personId))return series;
  const years=new Map(),reference=options.reference||data.referencia_predeterminada;
  for(const b of filterBallots(data,options)){
    if(b.totales_consistentes===false)continue;
    const position=majority(b.votos.filter(v=>reference.includes(v.bloque)));
    if(position===null)continue;
    const v=b.votos.find(v=>v.legislador===personId&&choices.has(v.voto));
    if(!v)continue;
    const year=Number(b.fecha.slice(0,4));
    if(!years.has(year))years.set(year,{year,matches:0,total:0,nonvotes:0,blocks:new Set()});
    const point=years.get(year);point.total++;point.matches+=Number(v.voto===position);
    point.nonvotes+=Number(v.voto==='NO VOTÓ');
    point.blocks.add(data.bloques[v.bloque]||'Sin bloque histórico identificado');
  }
  series.points=[...years.values()].sort((a,b)=>a.year-b.year).map(p=>({...p,
    blocks:[...p.blocks],rate:Math.round(p.matches/p.total*10000)/10000,people:1,source:'oficial'}));
  return series;
}
