"""Recolecta votaciones nominales del ciclo y conserva observaciones en SQLite."""
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
START = '2023-12-10'
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
    sessions, ballots, details, histories = (saved(k) for k in ('session', 'ballot', 'votes', 'blocks'))
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
            'totales_consistentes': ballot['totales_consistentes']})
    summary = {'sesiones': len(sessions), 'sesiones_con_votos': len({v['sesion'] for v in output}),
        'votaciones': len(output), 'votos': sum(len(v['votos']) for v in output),
        'sin_bloque_historico': unresolved,
        'recuentos_distintos_60': sum(len(v['votos']) != 60 for v in output),
        'totales_inconsistentes': sum(not v['totales_consistentes'] for v in output),
        'registros_fuente': sum(len(rows) for rows in details.values())}
    return {'actualizado': now, 'desde': START, 'hasta': end, 'resumen': summary,
        'fuente': BASE + 'pages/ExpedienteBusqueda.aspx',
        'referencia_predeterminada': ['119'],
        'referencia_nombre': 'Vamos por más',
        'legisladores': people, 'bloques': blocks, 'votaciones': output}


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
    sessions = fetch('GetSesionesAvanzado', {'FechaDesde': '10/12/2023', 'FechaHasta': end.strftime('%d/%m/%Y')})
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
    Path(args.db).parent.mkdir(parents=True, exist_ok=True)
    db = connect(args.db)
    try:
        with db:
            # A successful full run adds/corrects observations, never deletes on absence.
            for kind, values in [('session', {s['id_sesion_lp']: s for s in sessions}),
                                 ('ballot', ballots), ('votes', details), ('blocks', histories)]:
                for key, value in values.items():
                    save(db, kind, key, value, now)
            data = export(db, now, args.until)
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
