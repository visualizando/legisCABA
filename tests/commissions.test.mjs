import test from 'node:test';
import assert from 'node:assert/strict';
import {eligible,historical,upcoming,ranking,monthly,localNow} from '../site/assets/commissions-model.mjs';
const now=new Date('2026-11-06T15:00:00Z');
const row=(id,fecha,hora='11:00',extra={})=>({id,fecha,hora,presente:true,comision_id:'50',comision:'Social',tipo_id:'1',...extra});
test('Buenos Aires date and current-minute boundary do not double count',()=>{
  assert.equal(localNow(new Date('2026-11-07T01:00:00Z')),'2026-11-06T22:00');
  const rows=[row('1','2026-11-06'),row('2','2026-11-06','12:00'),row('3','2026-11-07')];
  assert.deepEqual(historical(rows,{},now).map(r=>r.id),['1']);
  assert.deepEqual(upcoming(rows,{},now).map(r=>r.id),['2','3']);
});
test('exclude protocol, absent rows and unidentified commissions',()=>{
  const rows=[row('1','2025-01-01'),row('2','2025-01-02','10:00',{tipo_id:'2'}),row('3','2025-01-03','10:00',{tipo_id:'3'}),row('4','2025-01-04','10:00',{presente:false}),row('5','2025-01-05','10:00',{comision_id:''})];
  assert.equal(eligible(rows).length,2);
  assert.equal(historical(rows,{year:'2026'},now).length,0);
  assert.equal(eligible(rows,{type:'2'}).length,1);
  assert.equal(eligible(rows,{commission:'99'}).length,0);
  assert.equal(ranking([...rows.slice(0,2),rows[0]])[0].total,2);
});
test('monthly series includes zero months within coverage',()=>{
  assert.deepEqual(monthly([row('1','2026-01-03')],'all','2026-01','2026-03'),[{month:'2026-01',count:1},{month:'2026-02',count:0},{month:'2026-03',count:0}]);
  assert.equal(monthly([],'2026').length,12);
});
test('agenda ignores statistical year but honors commission and type',()=>{
  const rows=[row('1','2026-11-10'),row('2','2026-11-10','10:00',{comision_id:'99'}),row('3','2026-11-10','09:00',{tipo_id:'2'})];
  assert.deepEqual(upcoming(rows,{year:'2024',commission:'50',type:'1'},now).map(r=>r.id),['1']);
});
test('special commissions and Labor are grouped by published name without inventing official IDs',()=>{
  const rows=[row('1','2026-01-01','10:00',{comision_id:'',comision:'',originador:'Comisión Especial de Cambio Climático'}),row('2','2026-01-01','10:00',{comision_id:'',comision:'',originador:'Labor Parlamentaria'}),row('3','2026-01-01','10:00',{comision_id:'',originador:'Dirección General de Protocolo y Ceremonial'})];
  const result=eligible(rows);
  assert.equal(result.length,2);
  assert.equal(result[0].comision_id,'');
  assert.equal(ranking(result).length,2);
  assert.equal(eligible(rows,{commission:'originador:Labor Parlamentaria'}).length,1);
});
