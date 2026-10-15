import test from 'node:test';
import assert from 'node:assert/strict';
import {majority,officialism,filterBallots,annualSeries} from '../site/assets/votes-model.mjs';
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
