"""Carga histórica reanudable; cachea respuestas y divide rangos que fallan."""
import argparse
import calendar
import concurrent.futures
import hashlib
import json
import sqlite3
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from scraper import BASE, parse_xml

CACHE = Path('data/backfill')


def fetch(start, end):
    path = CACHE / f'{start}_{end}.xml'
    if path.exists():
        body = path.read_bytes()
    else:
        params = dict(IdProyectoTipo='', IdAutoresInternos='', IdUbicacion='', IdEstado='',
                      Sumario='', SumarioExacto='0', FechaDesde=start.strftime('%d/%m/%Y'),
                      FechaHasta=end.strftime('%d/%m/%Y'), AnioParlamentario='', Limite='')
        req = urllib.request.Request(BASE + 'webservices/Json.asmx/GetExpedienteAvanzada',
            data=urllib.parse.urlencode(params).encode(),
            headers={'Content-Type':'application/x-www-form-urlencoded', 'User-Agent':'LegisCABA-monitor/0.1'})
        time.sleep(1)
        with urllib.request.urlopen(req, timeout=55) as response:
            body = response.read()
        records = parse_xml(body)
        validate(records, start, end)
        temp = path.with_suffix('.tmp')
        temp.write_bytes(body)
        temp.replace(path)
    records = parse_xml(body)
    validate(records, start, end)
    return records


def validate(records, start, end):
    for r in records:
        day = datetime.strptime(r['fecha_presentacion'], '%d/%m/%Y %H:%M:%S').date()
        if not start <= day <= end:
            raise ValueError(f"Fecha fuera de rango: {r['numero']}")
    if len({r['id'] for r in records}) != len(records):
        raise ValueError('IDs duplicados dentro de una respuesta')


def collect(start, end):
    try:
        records = fetch(start, end)
        # Large responses are checked through smaller windows to avoid possible caps.
        if len(records) >= 1000 and start != end:
            raise OSError('Respuesta grande: verificar en subrangos')
        print(f'{start} / {end}: {len(records)}', flush=True)
        return records, [{'desde':str(start), 'hasta':str(end), 'total':len(records)}]
    except (OSError, ET.ParseError) as exc:
        if start == end:
            for attempt in range(2):
                time.sleep(3 * (attempt + 1))
                try:
                    records = fetch(start, end)
                    return records, [{'desde':str(start), 'hasta':str(end), 'total':len(records)}]
                except (OSError, ET.ParseError):
                    pass
            raise RuntimeError(f'No se pudo consultar {start}: {exc}') from exc
        middle = start + (end-start)//2
        print(f'Dividiendo {start} / {end}: {exc}', flush=True)
        a, ca = collect(start, middle)
        b, cb = collect(middle + timedelta(days=1), end)
        return a+b, ca+cb


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--from-date', default='2023-12-10')
    p.add_argument('--to-date', default='2026-10-14')
    args = p.parse_args()
    start, last = date.fromisoformat(args.from_date), date.fromisoformat(args.to_date)
    if start > last:
        p.error('Rango invertido')
    CACHE.mkdir(parents=True, exist_ok=True)
    windows = []
    cursor = start
    while cursor <= last:
        end = min(date(cursor.year, cursor.month, calendar.monthrange(cursor.year, cursor.month)[1]), last)
        windows.append((cursor, end))
        cursor = end + timedelta(days=1)
    records, coverage = {}, []
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        futures = {pool.submit(collect, a, b):(a,b) for a,b in windows}
        for future in concurrent.futures.as_completed(futures):
            batch, chunks = future.result()
            coverage.extend(chunks)
            for item in batch:
                records[item['id']] = item
    if not records:
        raise ValueError('Carga vacía')
    stamp = datetime.now(timezone.utc).isoformat()
    with sqlite3.connect('data/legiscaba.sqlite') as db:
        db.executescript('''CREATE TABLE IF NOT EXISTS expedientes (id TEXT PRIMARY KEY, contenido TEXT NOT NULL,
            primera_observacion TEXT NOT NULL, ultima_observacion TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS versiones (id TEXT NOT NULL, hash TEXT NOT NULL, observado TEXT NOT NULL,
            contenido TEXT NOT NULL, PRIMARY KEY(id, hash));''')
        for r in records.values():
            content = json.dumps(r, ensure_ascii=False, sort_keys=True)
            digest = hashlib.sha256(content.encode()).hexdigest()
            db.execute('INSERT OR IGNORE INTO versiones VALUES (?, ?, ?, ?)', (r['id'],digest,stamp,content))
            db.execute('''INSERT INTO expedientes VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET
                contenido=excluded.contenido, ultima_observacion=excluded.ultima_observacion''', (r['id'],content,stamp,stamp))
        all_records = [json.loads(r[0]) for r in db.execute('SELECT contenido FROM expedientes ORDER BY id')]
    manifest = {'desde':str(start), 'hasta':str(last), 'completo':True, 'actualizado':stamp,
                'total':len(records), 'ventanas':sorted(coverage, key=lambda c:c['desde'])}
    for path, payload in [(Path('data/cobertura.json'),manifest),
                          (Path('data/expedientes.json'),{'actualizado':stamp,'total':len(all_records),'expedientes':all_records})]:
        temp = path.with_suffix('.tmp')
        temp.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        temp.replace(path)
    print(f'CARGA COMPLETA: {len(records)} expedientes',flush=True)


if __name__ == '__main__':
    main()
