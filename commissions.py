"""Agenda oficial -> historial SQLite y exportación estática de comisiones."""
import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, timedelta, timezone
import hashlib
import html
import json
from pathlib import Path
import sqlite3
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

BASE = 'https://parlamentaria.legislatura.gob.ar/webservices/Json.asmx/'
BA = timezone(timedelta(hours=-3))


def parse(body, expected):
    root = ET.fromstring(body)
    local = lambda s: s.rsplit('}', 1)[-1]
    if local(root.tag) != expected:
        raise ValueError('Respuesta inesperada: ' + root.tag)
    return [{local(c.tag): c.text or '' for c in n} for n in root]


def fetch(method, params, expected, cache, refresh=False, delay=.3):
    key = hashlib.sha256(json.dumps([method, params], sort_keys=True).encode()).hexdigest()
    path = cache / (key + '.xml')
    if path.exists() and not refresh:
        return parse(path.read_bytes(), expected)
    req = urllib.request.Request(BASE + method, data=urllib.parse.urlencode(params).encode(),
        headers={'User-Agent': 'LegisCABA-monitor/0.2', 'Content-Type': 'application/x-www-form-urlencoded'})
    for attempt in range(3):
        time.sleep(delay + (2 ** attempt if attempt else 0))
        try:
            with urllib.request.urlopen(req, timeout=60) as response:
                body = response.read()
            rows = parse(body, expected)
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(body)
            return rows
        except (OSError, ET.ParseError):
            if attempt == 2:
                raise


def windows(start, end):
    while start <= end:
        following = (start.replace(day=28) + timedelta(days=4)).replace(day=1)
        stop = min(following, end + timedelta(days=1))
        yield start, stop
        start = stop


def normalize(row):
    rid, aid = row.get('id_comision_reunion'), row.get('id_comision_agenda_reunion')
    if not rid or not aid or not row.get('FechaAgenda'):
        raise ValueError('Reunión sin identidad o fecha')
    day = date.fromisoformat(row['FechaAgenda']).isoformat()
    return {
        'id': rid, 'agenda_id': aid, 'fecha': day, 'hora': row.get('HoraDefinitiva', ''),
        'comision_id': row.get('IdComision', ''),
        'comision': html.unescape(row.get('NombreComision', '')).strip(),
        'tipo_id': row.get('id_comision_reunion_tipo', ''), 'tipo': row.get('comision_reunion_tipo', ''),
        'originador': html.unescape(row.get('Originador', '')),
        'salon': row.get('Salon', ''), 'ubicacion': row.get('Ubicacion', ''),
        'notas': html.unescape('\n'.join(row[k] for k in ('NotasReunion', 'notasExtrasEvento', 'notasExtrasReunion') if row.get(k))),
        'url': f'https://www.legislatura.gob.ar/AgendaLCABADetalle/{aid}/{rid}',
        'fuente': row,
    }


def connect(path):
    path.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(path)
    db.executescript('''
        CREATE TABLE IF NOT EXISTS reuniones (
            id TEXT PRIMARY KEY, fecha TEXT NOT NULL, contenido TEXT NOT NULL,
            huella TEXT NOT NULL, primera_observacion TEXT NOT NULL,
            ultima_observacion TEXT NOT NULL, presente INTEGER NOT NULL DEFAULT 1);
        CREATE TABLE IF NOT EXISTS versiones (
            secuencia INTEGER PRIMARY KEY, reunion_id TEXT NOT NULL,
            observado TEXT NOT NULL, contenido TEXT NOT NULL, huella TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS consultas (
            id INTEGER PRIMARY KEY, observado TEXT NOT NULL, desde TEXT NOT NULL,
            hasta TEXT NOT NULL, reuniones INTEGER NOT NULL);
        CREATE TABLE IF NOT EXISTS observaciones (
            consulta_id INTEGER NOT NULL, reunion_id TEXT NOT NULL, presente INTEGER NOT NULL,
            PRIMARY KEY(consulta_id,reunion_id));
        CREATE INDEX IF NOT EXISTS versiones_por_reunion ON versiones(reunion_id);
    ''')
    return db


def save(db, meetings, start, end, stamp):
    # Solo se llama tras completar y validar todo el rango. Ausencia != cancelación.
    with db:
        db.execute('UPDATE reuniones SET presente=0 WHERE fecha BETWEEN ? AND ?', (start, end))
        for item in meetings:
            content = json.dumps(item, ensure_ascii=False, sort_keys=True)
            digest = hashlib.sha256(content.encode()).hexdigest()
            old = db.execute('SELECT huella FROM reuniones WHERE id=?', (item['id'],)).fetchone()
            if not old or old[0] != digest:
                db.execute('INSERT INTO versiones(reunion_id,observado,contenido,huella) VALUES(?,?,?,?)',
                    (item['id'], stamp, content, digest))
            db.execute('''INSERT INTO reuniones VALUES(?,?,?,?,?,?,1)
                ON CONFLICT(id) DO UPDATE SET fecha=excluded.fecha,contenido=excluded.contenido,
                huella=excluded.huella,ultima_observacion=excluded.ultima_observacion,presente=1''',
                (item['id'], item['fecha'], content, digest, stamp, stamp))
        db.execute('INSERT INTO consultas(observado,desde,hasta,reuniones) VALUES(?,?,?,?)',
            (stamp, start, end, len(meetings)))
        run = db.execute('SELECT last_insert_rowid()').fetchone()[0]
        db.execute('''INSERT INTO observaciones SELECT ?,id,presente FROM reuniones
            WHERE fecha BETWEEN ? AND ?''', (run, start, end))


def export(db, output):
    meetings = []
    for content, first, last, present, count in db.execute('''SELECT r.contenido,r.primera_observacion,
        r.ultima_observacion,r.presente,(SELECT COUNT(*) FROM versiones v WHERE v.reunion_id=r.id)
        FROM reuniones r ORDER BY r.fecha,r.id'''):
        row = json.loads(content)
        row.pop('fuente', None)
        row.pop('fuente_evento', None)
        row.update(primera_observacion=first, ultima_observacion=last, presente=bool(present), versiones=count)
        meetings.append(row)
    runs = [dict(zip(('observado', 'desde', 'hasta', 'reuniones'), r)) for r in
        db.execute('SELECT observado,desde,hasta,reuniones FROM consultas ORDER BY id')]
    result = {'actualizado': runs[-1]['observado'], 'fuente': BASE,
        'desde': min(r['desde'] for r in runs), 'hasta': max(r['hasta'] for r in runs),
        'cobertura': runs, 'reuniones': meetings}
    output.parent.mkdir(parents=True, exist_ok=True)
    temp = output.with_suffix('.tmp')
    temp.write_text(json.dumps(result, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    temp.replace(output)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    today = datetime.now(BA).date()
    parser.add_argument('--from-date', type=date.fromisoformat)
    parser.add_argument('--to-date', type=date.fromisoformat, default=today + timedelta(days=60))
    parser.add_argument('--refresh', action='store_true', help='Ignorar caché de respuestas originales')
    parser.add_argument('--database', type=Path, default=Path('data/comisiones.sqlite'))
    parser.add_argument('--output', type=Path, default=Path('site/data/comisiones.json'))
    parser.add_argument('--cache', type=Path, default=Path('data/commission-cache'))
    args = parser.parse_args()
    start = args.from_date or (today - timedelta(days=90) if args.database.exists() else date(2023, 12, 10))
    if start > args.to_date:
        parser.error('El inicio debe ser anterior al fin')
    events, agendas = {}, {}
    stamp = datetime.now(timezone.utc).isoformat()
    ts = lambda d: int(datetime.combine(d, datetime.min.time(), tzinfo=BA).timestamp())
    for first, stop in windows(start, args.to_date):
        params = {'start': ts(first), 'end': ts(stop)}
        daily = fetch('GetAgendasMesCurso', params, 'ArrayOfEvents', args.cache, args.refresh)
        rows = fetch('GetAgendasMesCursoEvento', {**params, 'IdTipoReunion': ''}, 'ArrayOfEventsTR', args.cache, args.refresh)
        for row in daily:
            if first.isoformat() <= row['start'] < stop.isoformat():
                agendas[row['id']] = row['start']
        for row in rows:
            if first.isoformat() <= row['fecha_agenda'] < stop.isoformat():
                events[row['id_comision_reunion']] = row
                agendas[row['id_comision_agenda_reunion']] = row['fecha_agenda']
        print(f'{first} / {stop}: {len(daily)} agendas, {len(rows)} eventos (antes de filtrar límites)', flush=True)
    if not agendas and (args.to_date - start).days > 60:
        raise ValueError('Rango histórico vacío; no se publica')

    def detail(aid):
        rows = fetch('GetAgendasDiaById', {'idAgenda': aid}, 'ArrayOfEventsDay', args.cache, args.refresh)
        result = []
        for row in rows:
            if row['id_comision_agenda_reunion'] != aid or row['FechaAgenda'] != agendas[aid]:
                raise ValueError('Detalle fuera de su agenda')
            result.append(normalize(row))
        return result

    meetings = {}
    with ThreadPoolExecutor(max_workers=2) as pool:
        for i, rows in enumerate(pool.map(detail, sorted(agendas)), 1):
            for row in rows:
                if row['id'] in meetings and meetings[row['id']] != row:
                    raise ValueError('Identidad duplicada con contenidos distintos: ' + row['id'])
                meetings[row['id']] = row
            if i % 25 == 0:
                print(f'Detalles: {i}/{len(agendas)} agendas', flush=True)
    # Algunas agendas publicadas devuelven detalle vacío. Conservar el evento
    # mensual y recuperar el ID de comisión solo si el cruce observado es único.
    commission_ids = {}
    for rid, item in meetings.items():
        if rid in events and item['comision_id']:
            commission_ids.setdefault(events[rid]['comision'], set()).add((item['comision_id'], item['comision']))
    for rid in set(events) - meetings.keys():
        event = events[rid]
        candidates = commission_ids.get(event['comision'], set())
        ids = {cid for cid, name in candidates}
        cid = next(iter(ids)) if len(ids) == 1 else ''
        name = next((n for i, n in sorted(candidates) if i == cid), event['comision'])
        row = {'id_comision_reunion': rid, 'id_comision_agenda_reunion': event['id_comision_agenda_reunion'],
            'FechaAgenda': event['fecha_agenda'], 'HoraDefinitiva': event['hora'][:5],
            'IdComision': cid, 'NombreComision': name, 'Originador': event['originador'],
            'id_comision_reunion_tipo': event['id_comision_reunion_tipo'],
            'comision_reunion_tipo': event['comision_reunion_tipo'], 'NotasReunion': event['comisionNotasExtras']}
        item = normalize(row)
        item.update(detalle_incompleto=True, fuente_evento=event)
        meetings[rid] = item
        print(f'Detalle vacío: reunión {rid}; se conserva evento mensual (comisión: {cid or "sin ID"})', flush=True)
    db = connect(args.database)
    try:
        save(db, list(meetings.values()), start.isoformat(), args.to_date.isoformat(), stamp)
        export(db, args.output)
    finally:
        db.close()
    print(f'Historial guardado: {len(meetings)} reuniones; {args.output}', flush=True)


if __name__ == '__main__':
    main()
