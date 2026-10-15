const choices = new Set(['AFIRMATIVO','NEGATIVO','ABSTENCIÓN']);
export function majority(votes){
  const emitted=votes.filter(v=>choices.has(v.voto));
  for(const value of choices)if(emitted.filter(v=>v.voto===value).length>emitted.length/2)return value;
  return null;
}

// Each emitted individual vote has equal weight. Non-votes never count as disagreement.
export function officialism(data,{year='all',reference=data.referencia_predeterminada,contested=false}={}){
  const groups=new Map();let eligible=0,withoutReference=0,inconsistent=0;
  const ballots=data.votaciones.filter(b=>year==='all'||b.fecha.startsWith(year));
  for(const b of ballots){
    if(contested&&!(b.positivos>0&&(b.negativos>0||b.abstenciones>0)||b.negativos>0&&b.abstenciones>0))continue;
    if(b.totales_consistentes===false){inconsistent++;continue;}
    const position=majority(b.votos.filter(v=>reference.includes(v.bloque)));
    if(!position){withoutReference++;continue;}
    eligible++;
    for(const v of b.votos){
      if(!v.bloque)continue;
      if(!groups.has(v.bloque))groups.set(v.bloque,{id:v.bloque,name:data.bloques[v.bloque],matches:0,total:0,nonvotes:0,ballots:new Set()});
      const g=groups.get(v.bloque);
      if(!choices.has(v.voto)){g.nonvotes++;continue;}
      g.total++;g.matches+=Number(v.voto===position);g.ballots.add(b.id);
    }
  }
  return {eligible,withoutReference,inconsistent,ballots:ballots.length,rows:[...groups.values()].map(g=>({...g,ballots:g.ballots.size,rate:g.total?g.matches/g.total:null})).sort((a,b)=>(b.rate??-1)-(a.rate??-1)||a.name.localeCompare(b.name,'es'))};
}
