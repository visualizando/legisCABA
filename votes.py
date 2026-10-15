"""Recolecta votaciones nominales desde 2016 y conserva observaciones en SQLite."""
import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, timezone
import hashlib
import json
from pathlib import Path
import sqlite3
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

BASE = 'https://parlamentaria.legislatura.gob.ar/'
START = '2016-01-01'
RESUME = False


def records(body):
    root = ET.fromstring(body)
    if any(n.tag.rsplit('}', 1)[-1] == 'esError' and n.text == 'true' for n in root.iter()):
        raise ValueError('La fuente devolvió un error')
    return [{c.tag.rsplit('}', 1)[-1]: c.text or '' for c in n}
        for n in root.iter() if len(n) and all(not len(c) for c in n)
        and not any(c.tag.rsplit('}', 1)[-1] == 'esError' for c in n)]


def fetch(method, params):
    cache = Path('data/vote-cache') / (method + '-' + hashlib.sha256(json.dumps(params, sort_keys=True).encode()).hexdigest() + '.json')
    if RESUME and cache.exists():
        return json.loads(cache.read_text(encoding='utf-8'))
    request = urllib.request.Request(BASE + 'webservices/Json.asmx/' + method,
        data=urllib.parse.urlencode(params).encode(), headers={'User-Agent': 'LegisCABA/1.0'})
    for attempt in range(3):
        try:
            time.sleep(.25)
            with urllib.request.urlopen(request, timeout=45) as response:
                result = records(response.read())
            cache.parent.mkdir(parents=True, exist_ok=True)
            cache.write_text(json.dumps(result, ensure_ascii=False), encoding='utf-8')
            return result
        except (OSError, ET.ParseError):
            if attempt == 2:
                raise
            time.sleep(2 ** attempt)


def connect(path):
    db = sqlite3.connect(path)
    db.executescript('''
      CREATE TABLE IF NOT EXISTS observations (
        kind TEXT, id TEXT, digest TEXT, payload TEXT NOT NULL, observed_at TEXT NOT NULL,
        PRIMARY KEY(kind,id,digest));
      CREATE TABLE IF NOT EXISTS current (
        kind TEXT, id TEXT, payload TEXT NOT NULL, observed_at TEXT NOT NULL,
        PRIMARY KEY(kind,id));
      CREATE TABLE IF NOT EXISTS runs (
        observed_at TEXT PRIMARY KEY, since TEXT, until_date TEXT, summary TEXT);
      CREATE TABLE IF NOT EXISTS votaciones (
        id TEXT PRIMARY KEY, sesion TEXT NOT NULL, fecha TEXT NOT NULL, asunto TEXT,
        positivos INTEGER, negativos INTEGER, abstenciones INTEGER, totales_consistentes INTEGER);
      CREATE TABLE IF NOT EXISTS votos (
        votacion TEXT NOT NULL REFERENCES votaciones(id), legislador TEXT NOT NULL,
        nombre TEXT, bloque TEXT, bloque_nombre TEXT, voto TEXT NOT NULL, presencia TEXT,
        PRIMARY KEY(votacion,legislador));
      CREATE TABLE IF NOT EXISTS votacion_expedientes (
        votacion TEXT NOT NULL REFERENCES votaciones(id), expediente TEXT NOT NULL,
        PRIMARY KEY(votacion,expediente));
      CREATE TABLE IF NOT EXISTS proyectos (
        id TEXT PRIMARY KEY, numero TEXT, tipo TEXT, categoria TEXT, sumario TEXT);
    ''')
    return db


def save(db, kind, key, value, now):
    payload = json.dumps(value, ensure_ascii=False, sort_keys=True)
    digest = hashlib.sha256(payload.encode()).hexdigest()
    db.execute('INSERT OR IGNORE INTO observations VALUES (?,?,?,?,?)', (kind, str(key), digest, payload, now))
    db.execute('INSERT INTO current VALUES (?,?,?,?) ON CONFLICT(kind,id) DO UPDATE SET payload=excluded.payload, observed_at=excluded.observed_at', (kind, str(key), payload, now))


def iso(value):
    if not value:
        return None
    for fmt in ('%d/%m/%Y %H:%M:%S', '%d/%m/%Y', '%Y-%m-%d'):
        try:
            return datetime.strptime(value, fmt).date().isoformat()
        except ValueError:
            pass
    raise ValueError('Fecha no reconocida: ' + value)


def historical_block(history, day):
    matches = [b for b in history if b['desde'] and b['desde'] <= day and (not b['hasta'] or day <= b['hasta'])]
    # A shared boundary belongs to the more recently started period.
    matches.sort(key=lambda b: b['desde'], reverse=True)
    if matches and (len(matches) == 1 or matches[0]['desde'] != matches[1]['desde']):
        return matches[0]
    return None


def unique_votes(rows):
    unique = {}
    for row in rows:
        pid = row['id_legislador']
        if pid in unique and unique[pid]['votacion_tipo_descripcion'] != row['votacion_tipo_descripcion']:
            unique[pid] = {**row, 'votacion_tipo_descripcion': 'INCONSISTENTE'}
        elif pid not in unique:
            unique[pid] = row
    return list(unique.values())


def export(db, now, end):
    def saved(kind):
        return {key: json.loads(payload) for key, payload in db.execute('SELECT id,payload FROM current WHERE kind=?', (kind,))}
    sessions, ballots, details, histories, projects = (saved(k) for k in ('session', 'ballot', 'votes', 'blocks', 'project'))
    people = {}
    blocks = {}
    output = []
    unresolved = 0
    for key, ballot in sorted(ballots.items(), key=lambda item: (item[1]['fecha'], int(item[0]))):
        votes = []
        for row in unique_votes(details.get(key, [])):
            pid = row['id_legislador']
            people[pid] = (row['legislador_apellido'].strip() + ', ' + row['legislador_nombre'].strip())
            block = historical_block(histories.get(pid, []), ballot['fecha'])
            bid = block['id_bloque'] if block else None
            if block:
                blocks[bid] = block['bloque']
            else:
                unresolved += 1
            votes.append({'legislador': pid, 'bloque': bid,
                'voto': row['votacion_tipo_descripcion'], 'presencia': row.get('presente_descripcion', ''),
                'bloque_informado': row.get('id_bloque'), 'bloque_informado_nombre': row.get('bloque_nombre')})
        output.append({'id': key, 'sesion': ballot['id_sesion'], 'fecha': ballot['fecha'],
            'asunto': ballot['asunto'], 'expedientes': sorted(set(ballot['expedientes'])),
            'positivos': int(ballot['positivos']), 'negativos': int(ballot['negativos']),
            'abstenciones': int(ballot['abstenciones']), 'votos': votes,
            'totales_consistentes': ballot['totales_consistentes'],
            'categorias': sorted({projects[e]['categoria'] for e in ballot['expedientes'] if e in projects}),
            'proyectos': [{k: projects[e][k] for k in ('id','numero','tipo','categoria','sumario')} for e in sorted(set(ballot['expedientes'])) if e in projects]})
    summary = {'sesiones': len(sessions), 'sesiones_con_votos': len({v['sesion'] for v in output}),
        'votaciones': len(output), 'votos': sum(len(v['votos']) for v in output),
        'sin_bloque_historico': unresolved,
        'recuentos_distintos_60': sum(len(v['votos']) != 60 for v in output),
        'totales_inconsistentes': sum(not v['totales_consistentes'] for v in output),
        'registros_fuente': sum(len(rows) for rows in details.values()),
        'sin_categoria': sum(not b['categorias'] for b in output)}
    coverage = []
    for year in range(int(START[:4]), int(end[:4])+1):
        annual_sessions = [s for s in sessions.values() if iso(s['fch_sesion_lp']).startswith(str(year))]
        annual_votes = [b for b in output if b['fecha'].startswith(str(year))]
        coverage.append({'anio': year, 'sesiones':len(annual_sessions),
            'sesiones_con_votos':len({b['sesion'] for b in annual_votes}), 'votaciones':len(annual_votes),
            'primera':min((b['fecha'] for b in annual_votes),default=None),
            'ultima':max((b['fecha'] for b in annual_votes),default=None)})
    from vote_lineages import build_lineages
    lineages = build_lineages(histories, blocks)
    return {'actualizado': now, 'desde': START, 'hasta': end, 'resumen': summary,
        'fuente': BASE + 'pages/ExpedienteBusqueda.aspx',
        'referencia_predeterminada': ['119','86','83','7'],
        'referencia_nombre': 'PRO (nombres históricos)',
        'legisladores': people, 'bloques': blocks, 'votaciones': output, 'cobertura_anual':coverage,
        'metodologia': {'version':'tow-conformidad-1','referencia':'PRO',
            'agregacion':'Media aritmética de tasas individuales por legislador, bloque y año',
            'posiciones':['AFIRMATIVO','NEGATIVO','ABSTENCIÓN','NO VOTÓ'],
            'fuentes':['https://www.andytow.com/blog/2013/12/02/disciplina-de-bloques/',
                'https://www.andytow.com/blog/2014/12/07/midiendo-la-conformidad-legislativa/',
                'https://github.com/hhba/towlandia/blob/master/public/parlalines-d.php']}, **lineages}


def main():
    global RESUME
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--until', default=date.today().isoformat())
    parser.add_argument('--db', default='data/votaciones.sqlite')
    parser.add_argument('--output', default='site/data/votaciones.json')
    parser.add_argument('--resume', action='store_true', help='Reutilizar respuestas locales de una carga interrumpida; no usar para refrescar')
    args = parser.parse_args()
    RESUME = args.resume
    end = date.fromisoformat(args.until)
    now = datetime.now(timezone.utc).isoformat()
    # Annual windows avoid server timeouts on broad historical catalog queries.
    session_map = {}
    for year in range(int(START[:4]), end.year+1):
        entries = fetch('GetSesionesAvanzado', {'FechaDesde':f'01/01/{year}',
            'FechaHasta': min(date(year,12,31),end).strftime('%d/%m/%Y')})
        for entry in entries:
            session_map[entry['id_sesion_lp']] = entry
    sessions = list(session_map.values())
    if not sessions:
        raise ValueError('Catálogo de sesiones vacío; se conserva la base anterior')
    ballots = {}
    def get_ballots(session):
        sid = session['id_sesion_lp']
        return session, fetch('GetVotacionesAsuntos', {'IdExpediente': 0, 'IdSesion': sid})
    with ThreadPoolExecutor(max_workers=2) as pool:
        for session, entries in pool.map(get_ballots, sessions):
            day = iso(session['fch_sesion_lp'])
            if not START <= day <= args.until:
                raise ValueError('Sesión fuera del rango consultado')
            for entry in entries:
                key = entry['id_votacion']
                entry = {**entry, 'fecha': day, 'expedientes': [e for e in
                    (entry.get('id_expediente'), entry.get('id_expediente_despacho')) if e and e != '0']}
                if key in ballots:
                    old = ballots[key]
                    if any(old[k] != entry[k] for k in ('id_sesion', 'fecha', 'positivos', 'negativos', 'abstenciones')):
                        raise ValueError('ID de votación con datos contradictorios: ' + key)
                    old['expedientes'] = sorted(set(old['expedientes'] + entry['expedientes']))
                else:
                    ballots[key] = entry
    if not ballots:
        raise ValueError('Sin votaciones; se conserva la base anterior')
    def get_votes(key):
        rows = fetch('GetVotaciones', {'IdVotacionAsunto': key, 'IdExpediente': '', 'IdSesion': '', 'IdLegislador': ''})
        if not rows:
            raise ValueError('Detalle vacío: ' + key)
        if any(r['id_votacion'] != key or r['id_sesion'] != ballots[key]['id_sesion'] for r in rows):
            raise ValueError('Detalle de otra votación: ' + key)
        unique = unique_votes(rows)
        ballots[key]['totales_consistentes'] = all(
            sum(r['votacion_tipo_descripcion'] == vote for r in unique) == int(ballots[key][field])
            for field, vote in [('positivos', 'AFIRMATIVO'), ('negativos', 'NEGATIVO'), ('abstenciones', 'ABSTENCIÓN')]) and all(r['votacion_tipo_descripcion'] in ('AFIRMATIVO','NEGATIVO','ABSTENCIÓN','NO VOTÓ') for r in unique)
        return key, rows
    details = {}
    with ThreadPoolExecutor(max_workers=2) as pool:
        for i, (key, rows) in enumerate(pool.map(get_votes, ballots), 1):
            details[key] = rows
            if i % 25 == 0:
                print(f'{i}/{len(ballots)} votaciones consultadas', flush=True)
    ids = sorted({r['id_legislador'] for rows in details.values() for r in rows})
    def get_blocks(pid):
        rows = fetch('GetLegisladoresBloques', {'id_legislador': pid})
        return pid, [{'id_bloque': r['id_bloque'], 'bloque': r['bloque'],
            'desde': iso(r['fch_desde']), 'hasta': iso(r['fch_hasta'])} for r in rows]
    with ThreadPoolExecutor(max_workers=2) as pool:
        histories = dict(pool.map(get_blocks, ids))
    # Batch metadata supplies the same project categories used elsewhere on the site.
    from prepare_site import category
    exp_ids = sorted({eid for b in ballots.values() for eid in b['expedientes']}, key=int)
    projects = {}
    for offset in range(0, len(exp_ids), 80):
        batch = exp_ids[offset:offset+80]
        entries = fetch('GetExpedienteDatosBasicos', {'IdExpediente':'', 'NumeroOrden':'',
            'AnoParlamentario':'', 'IdExpedientes': ','.join(batch)})
        for r in entries:
            tipo = r['proyecto_tipo_des']
            projects[r['id_expediente']] = {'id':r['id_expediente'], 'numero':r['nro_de_expediente'],
                'tipo':tipo, 'sumario':r['sumario'],
                'categoria':category({'tipo':tipo,'sumario':r['sumario']}) if tipo in ('LEY','DECLARACION','RESOLUCION') else 'otros'}
        if not entries:
            raise ValueError('Metadatos de expedientes vacíos')
    print(f'{len(projects)} expedientes clasificados', flush=True)
    Path(args.db).parent.mkdir(parents=True, exist_ok=True)
    db = connect(args.db)
    try:
        with db:
            # A successful full run adds/corrects observations, never deletes on absence.
            for kind, values in [('session', {s['id_sesion_lp']: s for s in sessions}),
                                 ('ballot', ballots), ('votes', details), ('blocks', histories), ('project', projects)]:
                for key, value in values.items():
                    save(db, kind, key, value, now)
            data = export(db, now, args.until)
            for p in projects.values():
                db.execute('INSERT OR REPLACE INTO proyectos VALUES (?,?,?,?,?)',
                    (p['id'],p['numero'],p['tipo'],p['categoria'],p['sumario']))
            for b in data['votaciones']:
                db.execute('INSERT OR REPLACE INTO votaciones VALUES (?,?,?,?,?,?,?,?)',
                    (b['id'], b['sesion'], b['fecha'], b['asunto'], b['positivos'], b['negativos'], b['abstenciones'], b['totales_consistentes']))
                # Replace only a successfully observed ballot's members/links; preserve other ballots.
                db.execute('DELETE FROM votos WHERE votacion=?', (b['id'],))
                db.execute('DELETE FROM votacion_expedientes WHERE votacion=?', (b['id'],))
                for v in b['votos']:
                    db.execute('INSERT INTO votos VALUES (?,?,?,?,?,?,?)', (b['id'], v['legislador'],
                        data['legisladores'][v['legislador']], v['bloque'], data['bloques'].get(v['bloque']), v['voto'], v['presencia']))
                for eid in b['expedientes']:
                    db.execute('INSERT INTO votacion_expedientes VALUES (?,?)', (b['id'], eid))
            db.execute('INSERT INTO runs VALUES (?,?,?,?)', (now, START, args.until, json.dumps(data['resumen'])))
        target = Path(args.output)
        target.parent.mkdir(parents=True, exist_ok=True)
        temp = target.with_suffix('.tmp')
        temp.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
        temp.replace(target)
        print(json.dumps(data['resumen'], ensure_ascii=False), flush=True)
    finally:
        db.close()


if __name__ == '__main__':
    main()
