"""Public parliamentary search -> versioned JSON and SQLite (stdlib only)."""
import argparse
import hashlib
import json
import re
import sqlite3
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

BASE = 'https://parlamentaria.legislatura.gob.ar/'


def parse_xml(body):
    root = ET.fromstring(body)
    tag = lambda node: node.tag.rsplit('}', 1)[-1]
    if tag(root) != 'ArrayOfExpedienteAvanzado':
        raise ValueError('Respuesta inesperada: ' + tag(root))
    records = []
    for node in root:
        if tag(node) != 'expedienteAvanzado':
            continue
        raw = {tag(child): child.text or '' for child in node}
        if not raw.get('id_expediente') or not raw.get('nro_de_expediente'):
            raise ValueError('Expediente sin identidad')
        names = raw.get('coautores_des', '').split(';')
        ids = re.split('[;,]', raw.get('coautores_id', ''))
        names, ids = [s.strip() for s in names if s.strip()], [s.strip() for s in ids if s.strip()]
        if len(names) != len(ids):
            raise ValueError('Coautores desalineados: ' + raw['id_expediente'])
        records.append({
            'id': raw['id_expediente'], 'numero': raw['nro_de_expediente'],
            'autor': {'id': raw.get('autor_id', '').strip(), 'nombre': raw.get('autor_des', '')},
            'cofirmantes': [{'id': i, 'nombre': n} for i, n in zip(ids, names)],
            'tipo': raw.get('tipo_proyecto_des'), 'sumario': raw.get('sumario'),
            'fecha_presentacion': raw.get('fch_inicio'),
            'fecha_ultimo_movimiento': raw.get('fch_movimiento'),
            'ubicacion': raw.get('ubicacion_des'), 'estado': raw.get('descripcion'),
            'tiene_sancion': raw.get('TieneSancion') == '1',
            'url': BASE + 'pages/expediente.aspx?id=' + raw['id_expediente'],
            'documento_url': BASE + 'pages/download.aspx?IdDoc=' + raw['urlDoc'] if raw.get('urlDoc', '').isdigit() and int(raw['urlDoc']) > 0 else None,
            'fuente': raw,
        })
    return records


def request(method, params, delay):
    time.sleep(delay)
    req = urllib.request.Request(BASE + 'webservices/Json.asmx/' + method,
        data=urllib.parse.urlencode(params).encode(),
        headers={'User-Agent': 'LegisCABA-monitor/0.1', 'Content-Type': 'application/x-www-form-urlencoded'})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=90) as response:
                return parse_xml(response.read())
        except (OSError, ET.ParseError):
            if attempt == 2:
                raise
            time.sleep(2 ** (attempt + 1))


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--years', nargs='+', type=int, default=[date.today().year])
    p.add_argument('--number', type=int, help='Consulta puntual para verificar conectividad')
    p.add_argument('--delay', type=float, default=1)
    p.add_argument('--chunk-days', type=int, default=2, help='Días por consulta; evita el filtro de año del servidor')
    p.add_argument('--from-date', type=date.fromisoformat, help='Fecha mínima de presentación, YYYY-MM-DD')
    p.add_argument('--output', type=Path, default=Path('data'))
    args = p.parse_args()
    if args.delay < 0 or args.chunk_days < 1 or any(y < 1997 or y > date.today().year for y in args.years):
        p.error('Años o demora inválidos')
    records = {}
    # Refresh all selected years, including archived cases: old cases can change.
    for year in args.years:
        if args.number is not None:
            batches = [request('GetExpedienteByNroyAnio', {'NroExpediente': args.number, 'AnioExpediente': year}, args.delay)]
        else:
            batches = []
            start = max(date(year, 1, 1), args.from_date or date(year, 1, 1))
            last = min(date(year, 12, 31), date.today())
            while start <= last:
                end = min(start + timedelta(days=args.chunk_days - 1), last)
                batch = request('GetExpedienteAvanzada', {
                    'IdProyectoTipo': '', 'IdAutoresInternos': '', 'IdUbicacion': '', 'IdEstado': '',
                    'Sumario': '', 'SumarioExacto': '0', 'FechaDesde': start.strftime('%d/%m/%Y'),
                    'FechaHasta': end.strftime('%d/%m/%Y'), 'AnioParlamentario': '', 'Limite': '',
                }, args.delay)
                for item in batch:
                    submitted = datetime.strptime(item['fecha_presentacion'], '%d/%m/%Y %H:%M:%S').date()
                    if not start <= submitted <= end:
                        raise ValueError('El servidor devolvió un expediente fuera del rango consultado')
                print(f'{start} / {end}: {len(batch)} expedientes', flush=True)
                batches.append(batch)
                start = end + timedelta(days=1)
        for batch in batches:
            for item in batch:
                records[item['id']] = item
    if not records:
        raise ValueError('Consulta sin resultados; no se reemplazan los datos existentes')
    args.output.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).isoformat()
    with sqlite3.connect(args.output / 'legiscaba.sqlite') as db:
        db.executescript('''CREATE TABLE IF NOT EXISTS expedientes (
            id TEXT PRIMARY KEY, contenido TEXT NOT NULL, primera_observacion TEXT NOT NULL,
            ultima_observacion TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS versiones (
            id TEXT NOT NULL, hash TEXT NOT NULL, observado TEXT NOT NULL, contenido TEXT NOT NULL,
            PRIMARY KEY(id, hash));''')
        for item in records.values():
            content = json.dumps(item, ensure_ascii=False, sort_keys=True)
            digest = hashlib.sha256(content.encode()).hexdigest()
            db.execute('INSERT OR IGNORE INTO versiones VALUES (?, ?, ?, ?)', (item['id'], digest, stamp, content))
            db.execute('''INSERT INTO expedientes VALUES (?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET contenido=excluded.contenido,
                ultima_observacion=excluded.ultima_observacion''', (item['id'], content, stamp, stamp))
        all_records = [json.loads(row[0]) for row in db.execute('SELECT contenido FROM expedientes ORDER BY id')]
    payload = {'actualizado': stamp, 'total': len(all_records), 'expedientes': all_records}
    target = args.output / 'expedientes.json'
    temp = target.with_suffix('.tmp')
    temp.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    temp.replace(target)
    print(f'Publicados {len(all_records)} expedientes; observados {len(records)}')


if __name__ == '__main__':
    main()
