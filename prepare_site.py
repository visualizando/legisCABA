"""Exporta datos compactos y cruza proyectos con padrones y asuntos de sesión."""
import concurrent.futures
import json
import re
import time
import unicodedata
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from collections import Counter
from datetime import date, datetime, timezone
from pathlib import Path
from scraper import BASE

CACHE = Path('data/enrichment')
COMPOSITION_SOURCE='https://www.legislatura.gob.ar/seccion/composicion-actual.html'


def official_color(value):
    value=value.strip().lstrip('#')
    if not re.fullmatch(r'[0-9a-fA-F]{6}',value):
        raise ValueError('Color de bloque oficial inválido')
    return '#'+value.lower()


def local(node):
    return node.tag.rsplit('}', 1)[-1]


def rows(body, tag):
    root = ET.fromstring(body)
    if any(local(n) == 'esError' and n.text == 'true' for n in root.iter()):
        raise ValueError('Error de la fuente')
    return [{local(c):c.text or '' for c in n} for n in root.iter() if local(n)==tag]


def get(method, params, filename, refresh=False):
    target = CACHE/filename
    if target.exists() and not refresh:
        return target.read_bytes()
    req = urllib.request.Request(BASE+'webservices/Json.asmx/'+method,
        data=urllib.parse.urlencode(params).encode(), headers={'Content-Type':'application/x-www-form-urlencoded','User-Agent':'LegisCABA-monitor/0.1'})
    for attempt in range(3):
        try:
            time.sleep(.5)
            with urllib.request.urlopen(req,timeout=45) as response:
                body=response.read()
            ET.fromstring(body)
            temp=target.with_suffix('.tmp'); temp.write_bytes(body); temp.replace(target)
            return body
        except OSError:
            if attempt==2: raise
            time.sleep(2**attempt)


def category(project):
    if project['tipo']=='LEY': return 'ley'
    if project['tipo']=='DECLARACION': return 'declaracion'
    text=unicodedata.normalize('NFKD',project['sumario']).encode('ascii','ignore').decode().upper().strip()
    # Conservative, auditable heuristic: resolutions whose opening requests reports.
    if re.match(r'^(?:PEDIDO(?:S)? DE INFORME(?:S)?|(?:SOLICITASE|SOLICITA|REQUIERESE|REQUERIR|SOLICITAR)\b.{0,100}\bINFORM|INFORME(?:S)?\b)',text):
        return 'informes'
    return 'resolucion'


def main():
    import argparse
    p=argparse.ArgumentParser(); p.add_argument('--refresh',action='store_true'); args=p.parse_args()
    CACHE.mkdir(parents=True,exist_ok=True)
    source=json.loads(Path('data/expedientes.json').read_text(encoding='utf-8'))
    cutoff='2023-12-10'
    data={'actualizado':source['actualizado'],'desde':cutoff,'hasta':date.today().isoformat(),
          'proyectos':[r for r in source['expedientes'] if r['tipo'] in ('LEY','RESOLUCION','DECLARACION')
            and datetime.strptime(r['fecha_presentacion'],'%d/%m/%Y %H:%M:%S').date().isoformat()>=cutoff]}
    historic=rows(get('GetDiputadosHistorico',{},'historic.xml',args.refresh),'diputadosHistorico')
    active=rows(get('GetDiputadosActivosNuevo',{'id_bloque':''},'active.xml',args.refresh),'diputados')
    sessions=rows(get('GetSesionesAvanzado',{'FechaDesde':date.fromisoformat(data['desde']).strftime('%d/%m/%Y'),
        'FechaHasta':date.fromisoformat(data['hasta']).strftime('%d/%m/%Y')},'sessions.xml',args.refresh),'sesiones')
    lookup={r['id_legislador']:r for r in historic}
    current={r['id_legislador']:r for r in active}
    session_records={}
    def session_fetch(s):
        sid=s['id_sesion_lp']
        body=get('GetAsuntosConsideradosByIdSesion',{'IdSesion':sid},f'session-{sid}.xml',args.refresh)
        entries=rows(body,'asuntosConsiderados')
        print(f"Sesión {s['fch_sesion_lp']}: {len(entries)} asuntos",flush=True)
        return s,entries
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        for s,entries in pool.map(session_fetch,sessions):
            for e in entries:
                if e.get('id_expediente') and e['id_expediente']!='0':
                    session_records.setdefault(e['id_expediente'],[]).append({
                        'sesion':s['id_sesion_lp'],'fecha':s['fch_sesion_lp'],
                        'tipo':e['asunto_considerado_item_tipo_des'],'descripcion':e['descripcion']})
    person_ids=set(current)
    projects=[]
    for r in data['proyectos']:
        if '-D-' in r['numero']:
            person_ids.update(x['id'] for x in [r['autor'],*r['cofirmantes']] if x['id'] in lookup)
        day,clock=r['fecha_presentacion'].split()
        d,m,y=day.split('/')
        projects.append({'id':r['id'],'numero':r['numero'],'fecha':f'{y}-{int(m):02}-{int(d):02}',
            'autor':r['autor'],'cofirmantes':r['cofirmantes'],'tipo_oficial':r['tipo'],'categoria':category(r),
            'sumario':r['sumario'],'estado':r['estado'],'ubicacion':r['ubicacion'],
            'sancion':r['tiene_sancion'],'sesiones':session_records.get(r['id'],[]),
            'url':r['url'],'documento':r['documento_url']})
    people=[]
    blocks=rows(get('GetBloquesActivos',{'id_bloque':''},'official-blocks.xml',args.refresh),'bloques')
    official_blocks={b['bloque']:{'id':'bloque-'+b['bloque_id'],'nombre':b['bloque'],
        'color':official_color(b['bloque_color']),'vigente':True,'color_oficial':True,
        'url':'https://www.legislatura.gob.ar/'+b['bloque_url']} for b in blocks}
    for a in current.values():
        if a['bloque'] not in official_blocks or official_color(a['bloque_color'])!=official_blocks[a['bloque']]['color']:
            raise ValueError('La composición y el catálogo de bloques no coinciden: '+a['bloque'])
    groups=dict(official_blocks)
    def block_fetch(pid):
        history=rows(get('GetLegisladoresBloques',{'id_legislador':pid},f'blocks-{pid}.xml',args.refresh),'LegisladorBloque')
        periods=[]
        for b in history:
            def iso(value):
                return datetime.strptime(value,'%d/%m/%Y %H:%M:%S').date().isoformat() if value else None
            begin,end=iso(b['fch_desde']),iso(b['fch_hasta'])
            if begin and begin<=data['hasta']:
                periods.append({'bloque':b['bloque'],'id_bloque':b['id_bloque'],'desde':begin,'hasta':end})
        return pid,sorted(periods,key=lambda b:b['desde'])
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        histories=dict(pool.map(block_fetch,sorted(person_ids)))
    def term_fetch(pid):
        body=get('GetLegisladoresMandatos',{'id_legislador':pid},f'terms-{pid}.xml',args.refresh)
        terms=[]
        def iso(value):
            return datetime.strptime(value,'%d/%m/%Y %H:%M:%S').date().isoformat() if value else None
        for node in ET.fromstring(body).iter():
            if local(node)!='LegisladorMandato': continue
            fields={local(c):c.text or '' for c in node}
            begin,end=iso(fields['fch_desde']),iso(fields['fch_hasta'])
            if not begin or begin>data['hasta']: continue
            blocks=[{local(c):c.text or '' for c in b} for b in node.iter() if local(b)=='Bloque']
            blocks.sort(key=lambda b:iso(b['fch_desde']) or '')
            terms.append({'desde':begin,'hasta':end,'bloque_ingreso':blocks[0]['bloque'] if blocks else None})
        return pid,sorted(terms,key=lambda t:t['desde'])
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        term_histories=dict(pool.map(term_fetch,sorted(person_ids)))
    for pid in sorted(person_ids):
        r=lookup.get(pid,current.get(pid))
        a=current.get(pid,{})
        history=histories[pid]
        in_cycle=[b for b in history if not b['hasta'] or b['hasta']>=cutoff]
        block=a.get('bloque') or (in_cycle[-1]['bloque'] if in_cycle else history[-1]['bloque'] if history else None)
        block_note='Bloque actual' if a.get('bloque') else 'Último bloque del ciclo' if in_cycle else 'Último bloque previo al ciclo' if history else 'Bloque no disponible'
        if block not in groups:
            periods=[b for b in history if b['bloque']==block]
            bid=periods[-1]['id_bloque'] if periods else 'no-disponible'
            groups[block]={'id':'bloque-'+bid,'nombre':block or 'Bloque no disponible',
                'color':'#727a77','vigente':False,'color_oficial':False,'url':None}
        group=groups[block]['id']
        people.append({'id':pid,'nombre':f"{r['apellido'].strip()}, {r['nombre'].strip()}",
            'activo':pid in current,'bloque_actual':a.get('bloque'),'mandatos':term_histories[pid],
            'foto':a.get('fotoM') or a.get('fotoS') or a.get('foto') or None,
            'mandato_actual':{'desde':datetime.strptime(a['fecha_inicio_mandato'],'%d/%m/%Y').date().isoformat(),
                'hasta':datetime.strptime(a['fecha_fin_mandato'],'%d/%m/%Y').date().isoformat()} if a else None,
            'bloque_referencia':block,'bloque_referencia_nota':block_note,'grupo':group,'bloques_historia':history,
            'url':BASE+'pages/legislador.aspx?id='+pid})
    counts=Counter(a['bloque'] for a in current.values())
    visual_groups=[
        {'id':'peronismo','nombre':'Peronismo','color':'#34aad7'},
        {'id':'pro-aliados','nombre':'PRO','color':'#efb118'},
        {'id':'libertarios','nombre':'Libertarios','color':'#c367b3'},
        {'id':'ucr','nombre':'UCR','color':'#e86952'},
        {'id':'izquierda','nombre':'Izquierda','color':'#cb1f00'},
        {'id':'otros','nombre':'Otros','color':'#b3b3b3'},
    ]
    visual_blocks={
        'Fuerza por Buenos Aires':'peronismo','Unión por la Patria':'peronismo','Frente de Todos':'peronismo',
        'Vamos por más':'pro-aliados','Vamos Juntos':'pro-aliados','PRO':'pro-aliados',
        'La Libertad avanza':'libertarios','La Libertad Avanza':'libertarios',
        'Republicanos Unidos':'libertarios','Bloque República':'libertarios',
        'Ciudadanos Unidos / UCR':'ucr','UCR / Evolución':'ucr','UCR-Evolución':'ucr',
        'Frente de Izquierda de los Trabajadores / PO':'izquierda',
        'PTS Frente de Izq-Unidad':'izquierda','MST/Frente de Izquierda/Unidad':'izquierda',
        'Izquierda Socialista-Frente de Izquierda-Unidad':'izquierda',
    }
    for person in people:
        person['grupo_visual']=visual_blocks.get(person['bloque_referencia'],'otros')
    for visual in visual_groups:
        visual['bancas']=sum(p['activo'] and p['grupo_visual']==visual['id'] for p in people)
        visual['agrupacion']=True
    output={'actualizado':data['actualizado'],'enriquecido':datetime.now(timezone.utc).isoformat(),'desde':data['desde'],'hasta':data['hasta'],
        'sesiones_consultadas':len(sessions),'legisladores':people,'proyectos':projects,
        'grupos':sorted(groups.values(),key=lambda b:(not b['vigente'],b['nombre'])),
        'grupos_fuente':COMPOSITION_SOURCE,
        'grupos_visuales':visual_groups,'bloques_por_espacio':visual_blocks,
        'grupos_visuales_fuente':'Paleta y agrupación definidas para el monitor; no clasificación oficial.',
        'composicion_actual':{'fuente':'https://www.legislatura.gob.ar/seccion/composicion-actual.html',
            'servicio':BASE+'webservices/Json.asmx/GetDiputadosActivosNuevo','total':len(current),
            'consultada':datetime.fromtimestamp((CACHE/'active.xml').stat().st_mtime,timezone.utc).isoformat(),
            'bloques':dict(Counter(a['bloque'] for a in current.values()))},
        'metodologia':{'informes':'Heurística sobre el inicio del sumario de resoluciones; no clasificación oficial.',
            'sesion':'Asuntos considerados con ID de expediente; no mide debate individual ni duración.',
            'sancion':'Indicador oficial TieneSancion: no acredita promulgación, vigencia ni ausencia de veto.',
            'bloques':'Bloques oficiales conservados; espacios políticos y colores definidos para el monitor. No identifica partido individual ni atribuye retrospectivamente un espacio a cada firma.'}}
    dest=Path('site/data'); dest.mkdir(parents=True,exist_ok=True)
    target=dest/'monitor.json'; temp=target.with_suffix('.tmp')
    temp.write_text(json.dumps(output,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8'); temp.replace(target)
    print(json.dumps({'proyectos':len(projects),'legisladores':len(people),'sesiones':len(sessions),
        'con_registro_sesion':sum(bool(r['sesiones']) for r in projects),'categorias':Counter(r['categoria'] for r in projects)},ensure_ascii=False),flush=True)


if __name__=='__main__': main()
