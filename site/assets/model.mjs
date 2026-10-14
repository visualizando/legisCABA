export const categories = [
  {id:'ley',label:'Proyectos de ley',short:'Ley',color:'#245d78'},
  {id:'informes',label:'Pedidos de informes*',short:'Informes*',color:'#b44c31'},
  {id:'declaracion',label:'Declaraciones',short:'Declaración',color:'#617a52'},
  {id:'resolucion',label:'Otras resoluciones',short:'Otra resolución',color:'#806b84'},
];
export const normalize = s => String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export const signers = p => [...new Set([p.autor.id,...p.cofirmantes.map(c=>c.id)].filter(Boolean))];
export const filterProjects = (projects,year='all',category='all') => projects.filter(p=>(year==='all'||p.fecha.startsWith(year))&&(category==='all'||p.categoria===category));
export function personStats(projects,id){
  const authored=projects.filter(p=>p.autor.id===id);
  const coauthored=projects.filter(p=>p.autor.id!==id&&p.cofirmantes.some(c=>c.id===id));
  const signed=[...authored,...coauthored];
  return {authored,coauthored,signed,author:authored.length,coauthor:coauthored.length,
    sanction:signed.filter(p=>p.sancion).length,session:signed.filter(p=>p.sesiones.length).length,
    types:categories.map(c=>({...c,author:authored.filter(p=>p.categoria===c.id).length,coauthor:coauthored.filter(p=>p.categoria===c.id).length}))};
}
export function makeGraph(projects,people,mode='all',minimum=1){
  const ids=new Set(people.map(p=>p.id)), nodeMap=new Map(people.map(p=>[p.id,{...p,total:0,types:Object.fromEntries(categories.map(c=>[c.id,0]))}])), edgeMap=new Map();
  for(const p of projects){
    const signed=signers(p).filter(id=>ids.has(id));
    for(const id of signed){const n=nodeMap.get(id);n.total++;n.types[p.categoria]++;}
    for(let i=0;i<signed.length;i++)for(let j=i+1;j<signed.length;j++){
      if(mode==='author'&&signed[i]!==p.autor.id&&signed[j]!==p.autor.id)continue;
      const [a,b]=[signed[i],signed[j]].sort(),key=a+'|'+b;
      if(!edgeMap.has(key))edgeMap.set(key,{source:a,target:b,value:0,types:Object.fromEntries(categories.map(c=>[c.id,0]))});
      const e=edgeMap.get(key);e.value++;e.types[p.categoria]++;
    }
  }
  const edges=[...edgeMap.values()].filter(e=>e.value>=minimum), visible=new Set(edges.flatMap(e=>[e.source,e.target]));
  const nodes=[...nodeMap.values()].filter(n=>visible.has(n.id)).map(n=>({...n,dominant:categories.reduce((a,b)=>n.types[b.id]>n.types[a.id]?b:a).id}));
  return {nodes,edges,allEdges:[...edgeMap.values()],omitted:people.length-nodes.length};
}
export function partners(projects,id,people){
  const counts=new Map(), known=new Map(people.map(p=>[p.id,p]));
  for(const p of projects){const ids=signers(p);if(!ids.includes(id))continue;for(const other of ids)if(other!==id&&known.has(other))counts.set(other,(counts.get(other)||0)+1);}
  return [...counts].map(([id,value])=>({...known.get(id),value})).sort((a,b)=>b.value-a.value||a.nombre.localeCompare(b.nombre,'es'));
}
