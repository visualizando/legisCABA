import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {personStats,makeGraph,filterProjects,signers,partners} from '../site/assets/model.mjs';

const people=['a','b','c'].map(id=>({id,nombre:id}));
const sample={id:'1',fecha:'2026-03-02',categoria:'ley',autor:{id:'a'},cofirmantes:[{id:'b'},{id:'b'},{id:'a'},{id:'c'}],sancion:true,sesiones:[{},{}]};
test('Una firma por persona y proyecto, con autoría y coautoría separadas',()=>{
  assert.deepEqual(signers(sample),['a','b','c']);
  const a=personStats([sample],'a'),b=personStats([sample],'b');
  assert.equal(a.author,1);assert.equal(a.coauthor,0);assert.equal(b.coauthor,1);assert.equal(a.session,1);assert.equal(a.sanction,1);
});
test('La red cuenta pares únicos y distingue autor-coautor',()=>{
  const all=makeGraph([sample],people);assert.equal(all.edges.length,3);assert.ok(all.edges.every(e=>e.value===1));
  const author=makeGraph([sample],people,'author');assert.equal(author.edges.length,2);
  assert.equal(makeGraph([sample],people,'all',2).nodes.length,0);
  assert.equal(partners([sample],'a',people).length,2);
});
test('Los filtros se aplican antes de las métricas',()=>{
  assert.equal(filterProjects([sample],'2025','all').length,0);
  assert.equal(filterProjects([sample],'2026','ley').length,1);
  assert.equal(filterProjects([sample],'all','declaracion').length,0);
});
test('La exportación real conserva identidades, fechas y el expediente de control',()=>{
  const data=JSON.parse(readFileSync('site/data/monitor.json','utf8'));
  assert.equal(new Set(data.proyectos.map(p=>p.id)).size,data.proyectos.length);
  assert.ok(data.proyectos.length>0);
  const control=data.proyectos.find(p=>p.id==='139330');
  assert.equal(control.numero,'1-D-2026');assert.equal(control.autor.id,'30716');
  assert.equal(signers(control).length,4);
  assert.ok(data.legisladores.some(p=>p.id===control.autor.id));
  assert.ok(data.proyectos.every(p=>p.fecha>=data.desde&&p.fecha<=data.hasta));
  assert.ok(data.proyectos.every(p=>['ley','informes','declaracion','resolucion'].includes(p.categoria)));
  assert.equal(data.grupos_fuente,'https://www.legislatura.gob.ar/seccion/composicion-actual.html');
  const expected={'Vamos por más':'#ffcc00','Fuerza por Buenos Aires':'#a3d9f0','La Libertad avanza':'#909828','Transformación':'#365f85'};
  for(const [name,color] of Object.entries(expected))assert.equal(data.grupos.find(g=>g.nombre===name).color,color);
  assert.ok(data.legisladores.every(p=>p.bloque_referencia&&data.grupos.some(g=>g.id===p.grupo)));
  assert.ok(data.legisladores.every(p=>p.bloque_referencia_nota));
  const current=data.legisladores.filter(p=>p.activo);
  assert.ok(current.every(p=>data.grupos.some(g=>g.id===p.grupo&&g.nombre===p.bloque_actual&&g.color_oficial)));
  assert.equal(current.length,data.composicion_actual.total);
  assert.ok(current.every(p=>p.mandato_actual?.desde&&p.mandato_actual?.hasta));
  assert.equal(data.composicion_actual.fuente,'https://www.legislatura.gob.ar/seccion/composicion-actual.html');
  const casielles=data.legisladores.find(p=>p.bloque_actual==='Transformación');
  assert.equal(casielles.grupo_visual,'otros');
  assert.notEqual(casielles.grupo,'otros');
  assert.deepEqual(data.grupos_visuales.map(g=>g.color),['#34aad7','#efb118','#c367b3','#e86952','#cb1f00','#b3b3b3']);
  assert.deepEqual(data.grupos_visuales.map(g=>g.nombre),['Peronismo','Pro y aliados','Libertarios','UCR','Izquierda','Otros']);
  assert.ok(data.legisladores.filter(p=>['Unión por la Patria','Fuerza por Buenos Aires'].includes(p.bloque_referencia)).every(p=>p.grupo_visual==='peronismo'));
});
