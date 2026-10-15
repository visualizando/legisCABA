import test from 'node:test';
import assert from 'node:assert/strict';
import {majority,officialism} from '../site/assets/votes-model.mjs';
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
