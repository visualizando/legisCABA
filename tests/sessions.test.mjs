import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeSessions,annualCounts,cumulativeSessions,calendarDay,buenosAiresToday} from '../site/assets/sessions-model.mjs';

const raw=(id,date,type='ORDINARIA')=>({id_sesion_lp:id,fecha:date,dsc_sesion_tipo:type,ano_parlamentario:date.slice(0,4)});
test('calendar dates stay unchanged across zones and leap years',()=>{
  assert.equal(buenosAiresToday(new Date('2026-11-07T01:00:00Z')),'2026-11-06');
  assert.equal(calendarDay('2024-03-01'),calendarDay('2025-03-01'));
  const rows=normalizeSessions([raw('a','2024-02-29'),raw('b','2024-03-01'),raw('c','2025-03-01'),raw('d','2025-03-02')]);
  assert.deepEqual(annualCounts(rows,{today:'2026-03-01',mode:'today'}).map(r=>r.total),[2,1]);
  assert.deepEqual(annualCounts(rows,{today:'2026-02-28',mode:'today'}).map(r=>r.total),[0,0]);
});
test('normalization counts IDs once, rejects corrupt records and keeps calendar year',()=>{
  const row={...raw('a','2025-01-03'),ano_parlamentario:'2024'};
  assert.equal(normalizeSessions([row,row]).length,1);
  assert.equal(normalizeSessions([row])[0].year,2025);
  assert.throws(()=>normalizeSessions([]));
  assert.throws(()=>normalizeSessions([raw('a','2025-02-29')]));
  assert.throws(()=>normalizeSessions([row,{...row,fecha:'2025-01-04'}]));
});
test('type filtering preserves zero years and excludes future sessions',()=>{
  const rows=normalizeSessions([raw('a','2024-02-01'),raw('b','2025-01-01','ESPECIAL'),raw('c','2026-12-01')]);
  const counts=annualCounts(rows,{today:'2026-11-06',type:'ESPECIAL'});
  assert.deepEqual(counts.map(r=>r.total),[0,1,0]);
  assert.equal(annualCounts(rows,{today:'2026-11-06'}).at(-1).total,0);
});
test('cumulative series count same-day sessions exactly and extend to observation cutoff',()=>{
  const rows=normalizeSessions([raw('a','2025-02-01'),raw('b','2025-02-01'),raw('c','2026-02-02'),raw('d','2026-12-01')]);
  const result=cumulativeSessions(rows,{today:'2026-11-06'});
  assert.equal(result[0].points.find(p=>p.day===calendarDay('2025-02-01')).count,2);
  assert.equal(result[0].points.at(-1).day,calendarDay('2025-12-31'));
  assert.equal(result[1].total,1);
  assert.equal(result[1].points.at(-1).day,calendarDay('2026-11-06'));
});
test('bundled snapshot has unique valid sessions and reconciles with annual and cumulative totals',()=>{
  const snapshot=JSON.parse(readFileSync(new URL('../site/data/sesiones.json',import.meta.url),'utf8'));
  const rows=normalizeSessions(snapshot.rows),today='9999-12-31';
  assert.equal(rows.length,snapshot.rows.length);
  assert.equal(annualCounts(rows,{today}).reduce((sum,r)=>sum+r.total,0),rows.length);
  assert.equal(cumulativeSessions(rows,{today}).reduce((sum,r)=>sum+r.total,0),rows.length);
});
