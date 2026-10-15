import test from 'node:test';
import assert from 'node:assert/strict';
import {majority,officialism,filterBallots,annualSeries} from '../site/assets/votes-model.mjs';
const vote=(bloque,voto)=>({bloque,voto});
test('strict majority ignores non-votes and abstention is a position',()=>{
  assert.equal(majority([vote('r','AFIRMATIVO'),vote('r','NO VOTÓ')]),'AFIRMATIVO');
  assert.equal(majority([vote('r','AFIRMATIVO'),vote('r','NEGATIVO')]),null);
  assert.equal(majority([vote('r','ABSTENCIÓN')]),'ABSTENCIÓN');
  assert.equal(majority([]),null);
});
const data={referencia_predeterminada:['r'],bloques:{r:'Referencia',a:'Otro'},votaciones:[
  {id:'1',fecha:'2024-05-01',positivos:3,negativos:1,abstenciones:0,votos:[vote('r','AFIRMATIVO'),vote('a','AFIRMATIVO'),vote('a','AFIRMATIVO'),vote('a','NEGATIVO'),vote('a','NO VOTÓ'),vote(null,'AFIRMATIVO')]},
  {id:'2',fecha:'2025-05-01',positivos:3,negativos:0,abstenciones:0,votos:[vote('r','AFIRMATIVO'),vote('a','AFIRMATIVO')]},
  {id:'3',fecha:'2025-06-01',positivos:1,negativos:1,abstenciones:0,votos:[vote('r','AFIRMATIVO'),vote('r','NEGATIVO'),vote('a','NEGATIVO')]},
  {id:'4',fecha:'2025-06-02',totales_consistentes:false,positivos:99,negativos:0,abstenciones:0,votos:[vote('r','AFIRMATIVO'),vote('a','NEGATIVO')]}
]};
test('individual votes are weighted equally, unknown blocks and nonvotes excluded',()=>{
  const result=officialism(data),row=result.rows.find(r=>r.id==='a');
  assert.equal(row.matches,3);assert.equal(row.total,4);assert.equal(row.rate,.75);
  assert.equal(row.nonvotes,1);assert.equal(row.ballots,2);
  assert.equal(result.eligible,2);assert.equal(result.withoutReference,1);
  assert.equal(result.inconsistent,1);
});
test('year, contested and reference filters are independent',()=>{
  assert.equal(officialism(data,{year:'2024'}).rows.find(r=>r.id==='a').total,3);
  assert.equal(officialism(data,{contested:true}).rows.find(r=>r.id==='a').rate,2/3);
  assert.equal(officialism(data,{reference:['missing']}).rows.length,0);
});

test('categories count a multi-project ballot once and distinguish missing categories',()=>{
  const d={votaciones:[{id:'1',fecha:'2024-01-01',categorias:['ley','resolucion']},{id:'2',fecha:'2024-02-01',categorias:['informes']},{id:'3',fecha:'2024-03-01',categorias:[]}]};
  assert.equal(filterBallots(d,{category:'all'}).length,3);
  assert.deepEqual(filterBallots(d,{category:'ley'}).map(b=>b.id),['1']);
  assert.deepEqual(filterBallots(d,{category:'informes'}).map(b=>b.id),['2']);
  assert.deepEqual(filterBallots(d,{category:'sin-datos'}).map(b=>b.id),['3']);
});
test('renamed blocks are pooled and current-only does not alter the historical reference majority',()=>{
  const d={referencia_predeterminada:['119','86'],bloques:{'119':'PRO','86':'PRO antes','118':'Antes','124':'Ahora'},
    bloque_trayectoria:{'86':'119','119':'119','118':'124','124':'124'},trayectorias:{'124':{nombre:'Ahora'},'119':{nombre:'PRO'}},
    votaciones:[{id:'x',fecha:'2021-01-01',positivos:3,negativos:1,abstenciones:0,votos:[
      {...vote('86','AFIRMATIVO'),legislador:'r1'},{...vote('86','AFIRMATIVO'),legislador:'r2'},
      {...vote('86','NEGATIVO'),legislador:'r3'},{...vote('118','AFIRMATIVO'),legislador:'a'}]}]};
  const result=officialism(d,{activeIds:new Set(['r3','a'])});
  assert.equal(result.rows.find(r=>r.id==='119').rate,0);
  assert.equal(result.rows.find(r=>r.id==='124').rate,1);
  assert.equal(officialism(d,{grouped:false}).rows.some(r=>r.id==='118'),true);
});
test('historical splice never duplicates overlap years and legacy aggregates cannot be filtered by type',()=>{
  const d={referencia_predeterminada:['119'],bloques:{'119':'PRO'},bloque_trayectoria:{'83':'119','119':'119'},trayectorias:{'119':{nombre:'PRO'}},
    votaciones:[2021,2022,2023].map(y=>({id:String(y),fecha:y+'-05-01',categorias:['ley'],positivos:1,negativos:0,abstenciones:0,votos:[vote('119','AFIRMATIVO')]}))};
  const h={series:[{id:'h',nombre:'PRO',bloque_enlace:'83',datos:[[2020,.8],[2021,.9],[2022,.95]]}]};
  const joined=annualSeries(d,h).series[0].points;
  assert.deepEqual(joined.map(p=>p.year),[2020,2021,2022,2023]);
  assert.equal(joined.find(p=>p.year===2022).rate,.95);
  assert.equal(joined.find(p=>p.year===2023).source,'oficial');
  const filtered=annualSeries(d,h,{category:'ley'});
  assert.equal(filtered.compatible,false);
  assert.deepEqual(filtered.series[0].points.map(p=>p.year),[2021,2022,2023]);
  assert.equal(filtered.series[0].points[1].rate,1);
});
