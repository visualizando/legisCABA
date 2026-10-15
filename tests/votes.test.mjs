import test from 'node:test';
import assert from 'node:assert/strict';
import {majority,officialism,compareOfficialism,filterBallots,annualSeries,personAnnualSeries,expandVoteTypes} from '../site/assets/votes-model.mjs';
const vote=(bloque,voto,legislador)=>({bloque,voto,legislador});
test('winning position includes NO VOTO, abstention and rejects ties',()=>{
  assert.equal(majority([vote('r','AFIRMATIVO'),vote('r','NO VOTÓ')]),null);
  assert.equal(majority([vote('r','NO VOTÓ'),vote('r','NO VOTÓ'),vote('r','AFIRMATIVO')]),'NO VOTÓ');
  assert.equal(majority([vote('r','ABSTENCIÓN')]),'ABSTENCIÓN');
  assert.equal(majority([]),null);
  assert.equal(majority([vote('r','AFIRMATIVO'),vote('r','AFIRMATIVO'),vote('r','NEGATIVO'),vote('r','ABSTENCIÓN')]),'AFIRMATIVO');
});
const data={referencia_predeterminada:['r'],bloques:{r:'Referencia',a:'Otro'},votaciones:[
  {id:'1',fecha:'2024-05-01',positivos:3,negativos:1,abstenciones:0,votos:[vote('r','AFIRMATIVO','r1'),vote('a','AFIRMATIVO','a1'),vote('a','AFIRMATIVO','a2'),vote('a','NEGATIVO','a3'),vote('a','NO VOTÓ','a4'),vote(null,'AFIRMATIVO','unknown')]},
  {id:'2',fecha:'2025-05-01',positivos:2,negativos:0,abstenciones:0,votos:[vote('r','AFIRMATIVO','r1'),vote('a','AFIRMATIVO','a1')]},
  {id:'3',fecha:'2025-06-01',positivos:1,negativos:1,abstenciones:0,votos:[vote('r','AFIRMATIVO','r1'),vote('r','NEGATIVO','r2'),vote('a','NEGATIVO','a1')]},
  {id:'4',fecha:'2025-06-02',totales_consistentes:false,positivos:99,negativos:0,abstenciones:0,votos:[vote('r','AFIRMATIVO','r1'),vote('a','NEGATIVO','a1')]}
]};
test('Tow average gives each legislator equal weight, including non-participation in denominators',()=>{
  const result=officialism(data),row=result.rows.find(r=>r.id==='a');
  assert.equal(row.matches,3);assert.equal(row.total,5);assert.equal(row.rate,.5);
  assert.equal(row.people,4);assert.equal(row.nonvotes,1);assert.equal(row.ballots,2);
  assert.notEqual(row.rate,row.matches/row.total);
  assert.deepEqual(row.individuals.map(p=>[p.id,p.matches,p.total]),[['a1',2,2],['a2',1,1],['a3',0,1],['a4',0,1]]);
  assert.equal(result.eligible,2);assert.equal(result.withoutReference,1);assert.equal(result.inconsistent,1);
});
test('year, contested and reference filters are independent',()=>{
  assert.equal(officialism(data,{year:'2024'}).rows.find(r=>r.id==='a').total,4);
  assert.equal(officialism(data,{contested:true}).rows.find(r=>r.id==='a').rate,.5);
  assert.equal(officialism(data,{reference:['missing']}).rows.length,0);
});
test('a shared NO VOTO position is a coincidence, not automatically a disagreement',()=>{
  const d={referencia_predeterminada:['r'],bloques:{r:'Referencia',a:'Otro'},votaciones:[{id:'1',fecha:'2024-05-01',positivos:0,negativos:0,abstenciones:0,votos:[vote('r','NO VOTÓ','r1'),vote('a','NO VOTÓ','a1')]}]};
  assert.equal(officialism(d).rows.find(r=>r.id==='a').rate,1);
});
test('categories count a multi-project ballot once and distinguish missing categories',()=>{
  const d={votaciones:[{id:'1',fecha:'2024-01-01',categorias:['ley','resolucion']},{id:'2',fecha:'2024-02-01',categorias:['informes']},{id:'3',fecha:'2024-03-01',categorias:[]}]};
  assert.equal(filterBallots(d,{category:'all'}).length,3);
  assert.deepEqual(filterBallots(d,{category:'ley'}).map(b=>b.id),['1']);
  assert.deepEqual(filterBallots(d,{category:'informes'}).map(b=>b.id),['2']);
  assert.deepEqual(filterBallots(d,{category:'sin-datos'}).map(b=>b.id),['3']);
  assert.deepEqual(filterBallots(d,{types:['ley','resolucion']}).map(b=>b.id),['1']);
  assert.deepEqual(filterBallots(d,{types:['ley','informes']}).map(b=>b.id),['1','2']);
  assert.deepEqual(filterBallots(d,{types:['informes','sin-datos']}).map(b=>b.id),['2','3']);
  assert.equal(filterBallots(d,{types:[]}).length,0);
});

test('four visible types retain all categories and merge other resolutions and missing metadata into Otros',()=>{
  const d={votaciones:[
    {id:'1',fecha:'2025-01-01',categorias:['ley','resolucion']},
    {id:'2',fecha:'2025-01-02',categorias:['resolucion']},
    {id:'3',fecha:'2025-01-03',categorias:['otros']},
    {id:'4',fecha:'2025-01-04',categorias:[]},
    {id:'5',fecha:'2025-01-05',categorias:['informes']},
    {id:'6',fecha:'2025-01-06',categorias:['declaracion']}
  ]};
  assert.deepEqual(filterBallots(d,{types:expandVoteTypes(['otros'])}).map(b=>b.id),['1','2','3','4']);
  assert.deepEqual(filterBallots(d,{types:expandVoteTypes(['ley','otros'])}).map(b=>b.id),['1','2','3','4']);
  assert.equal(filterBallots(d,{types:expandVoteTypes(['ley','informes','declaracion','otros'])}).length,6);
});

test('comparison preserves consensual ballots in general and applies type and year filters to both measures',()=>{
  const d={referencia_predeterminada:['r'],bloques:{r:'PRO',a:'Otro'},votaciones:[
    {id:'1',fecha:'2025-03-01',categorias:['ley','resolucion'],positivos:2,negativos:0,abstenciones:0,votos:[vote('r','AFIRMATIVO','r1'),vote('a','AFIRMATIVO','a1')]},
    {id:'2',fecha:'2025-03-02',categorias:['ley'],positivos:1,negativos:1,abstenciones:0,votos:[vote('r','AFIRMATIVO','r1'),vote('a','NEGATIVO','a1')]},
    {id:'3',fecha:'2026-03-01',categorias:['informes'],positivos:1,negativos:1,abstenciones:0,votos:[vote('r','NEGATIVO','r1'),vote('a','AFIRMATIVO','a1')]}
  ]};
  const result=compareOfficialism(d,{year:'2025',types:['ley','resolucion'],contested:true});
  const row=result.rows.find(r=>r.id==='a');
  assert.equal(result.general.eligible,2);assert.equal(result.contested.eligible,1);
  assert.equal(row.rate,.5);assert.equal(row.total,2);
  assert.equal(row.contested.rate,0);assert.equal(row.contested.total,1);
  const onlyConsensus=compareOfficialism(d,{year:'2025',types:['resolucion']});
  assert.equal(onlyConsensus.rows.find(r=>r.id==='a').rate,1);
  assert.equal(onlyConsensus.rows.find(r=>r.id==='a').contested,null);
  assert.equal(onlyConsensus.contested.eligible,0);
  assert.equal(annualSeries(d,{types:['ley','resolucion']}).series[0].points.length,1);
});
test('renamed blocs are pooled; current-only never changes the governing reference position',()=>{
  const d={referencia_predeterminada:['119','86'],bloques:{'119':'PRO','86':'PRO antes','118':'Antes','124':'Ahora'},
    bloque_trayectoria:{'86':'119','119':'119','118':'124','124':'124'},trayectorias:{'124':{nombre:'Ahora'},'119':{nombre:'PRO'}},
    votaciones:[{id:'x',fecha:'2021-01-01',positivos:3,negativos:1,abstenciones:0,votos:[vote('86','AFIRMATIVO','r1'),vote('86','AFIRMATIVO','r2'),vote('86','NEGATIVO','r3'),vote('118','AFIRMATIVO','a')]}]};
  const result=officialism(d,{activeIds:new Set(['r3','a'])});
  assert.equal(result.rows.find(r=>r.id==='119').rate,0);
  assert.equal(result.rows.find(r=>r.id==='124').rate,1);
  assert.equal(officialism(d,{grouped:false}).rows.some(r=>r.id==='118'),true);
});
test('every year is recalculated from raw votes; source archives never replace a point',()=>{
  const d={referencia_predeterminada:['119'],bloques:{'119':'PRO'},votaciones:[2016,2018,2022,2023].map(y=>({id:String(y),fecha:y+'-09-01',categorias:['ley'],positivos:1,negativos:0,abstenciones:0,votos:[vote('119','AFIRMATIVO','r1')]}))};
  const joined=annualSeries(d).series[0].points;
  assert.deepEqual(joined.map(p=>p.year),[2016,2018,2022,2023]);
  assert.ok(joined.every(p=>p.rate===1&&p.source==='oficial'));
  assert.deepEqual(annualSeries(d,{category:'ley'}).series[0].points,joined);
  assert.deepEqual(annualSeries(d,{year:'2018'}).series[0].points.map(p=>p.year),[2018]);
});

test('individual trajectory follows one person across blocs and preserves missing years',()=>{
  const d={referencia_predeterminada:['r'],legisladores:{p:'Persona'},bloques:{r:'PRO',a:'Antes',b:'Después'},votaciones:[
    {id:'1',fecha:'2022-03-01',categorias:['ley'],positivos:2,negativos:0,abstenciones:0,votos:[vote('r','AFIRMATIVO','r1'),vote('a','AFIRMATIVO','p')]},
    {id:'2',fecha:'2022-05-01',categorias:['ley','resolucion'],positivos:1,negativos:1,abstenciones:0,votos:[vote('r','AFIRMATIVO','r1'),vote('b','NEGATIVO','p')]},
    {id:'3',fecha:'2024-03-01',categorias:['informes'],positivos:1,negativos:0,abstenciones:0,votos:[vote('r','AFIRMATIVO','r1'),vote(null,'NO VOTÓ','p')]},
    {id:'4',fecha:'2024-05-01',categorias:['ley'],positivos:1,negativos:1,abstenciones:0,votos:[vote('r','AFIRMATIVO','r1'),vote('r','NEGATIVO','r2'),vote('b','AFIRMATIVO','p')]},
    {id:'5',fecha:'2024-06-01',categorias:['ley'],positivos:9,negativos:0,abstenciones:0,totales_consistentes:false,votos:[vote('r','AFIRMATIVO','r1'),vote('b','AFIRMATIVO','p')]}
  ]};
  const series=personAnnualSeries(d,'p');
  assert.equal(series.kind,'person');
  assert.deepEqual(series.points.map(p=>[p.year,p.matches,p.total,p.rate]),[[2022,1,2,.5],[2024,0,1,0]]);
  assert.deepEqual(series.points[0].blocks,['Antes','Después']);
  assert.deepEqual(series.points[1].blocks,['Sin bloque histórico identificado']);
  assert.equal(series.points[1].nonvotes,1);
  assert.deepEqual(personAnnualSeries(d,'p',{types:['ley','resolucion']}).points.map(p=>p.total),[2]);
  assert.deepEqual(personAnnualSeries(d,'p',{contested:true}).points.map(p=>[p.year,p.rate,p.total]),[[2022,0,1]]);
  assert.equal(personAnnualSeries(d,'p',{year:'2023'}).points.length,0);
  assert.equal(personAnnualSeries(d,'p',{activeIds:new Set(['r1'])}).points.length,0);
  assert.equal(personAnnualSeries(d,'p',{activeIds:new Set(['p'])}).points[0].rate,.5);
});
