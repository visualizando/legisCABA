"""Mirror the existing ScrapperTown CSV; this does not scrape the Legislature."""
import csv
import datetime as dt
import io
import json
from pathlib import Path
from urllib.request import urlopen

URL = 'https://raw.githubusercontent.com/rusosnith/ScrapperTown/refs/heads/main/sesiones_legislatura.csv'
ROOT = Path(__file__).resolve().parents[1]


def snapshot(content):
    records = list(csv.DictReader(io.StringIO(content.decode('utf-8-sig'), newline='')))
    if not records:
        raise ValueError('CSV vacío')
    seen = {}
    for row in records:
        dt.date.fromisoformat(row['fecha'])
        if not row['id_sesion_lp'] or not row['dsc_sesion_tipo'].strip():
            raise ValueError('Sesión sin ID o tipo')
        if row['id_sesion_lp'] in seen and seen[row['id_sesion_lp']] != row:
            raise ValueError('ID contradictorio')
        seen[row['id_sesion_lp']] = row
    return {'source': URL, 'captured_at': dt.datetime.now(dt.timezone.utc).isoformat(), 'rows': list(seen.values())}


if __name__ == '__main__':
    with urlopen(URL, timeout=45) as response:
        data = snapshot(response.read())
    target = ROOT / 'site/data/sesiones.json'
    temp = target.with_suffix('.tmp')
    temp.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    temp.replace(target)
    print(f"Sesiones: {len(data['rows'])}; última fecha: {max(r['fecha'] for r in data['rows'])}")
