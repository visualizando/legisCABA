"""Verifica cobertura y genera exportación de proyectos y resumen de la carga."""
import json
from contextlib import closing
import sqlite3
from collections import Counter
from datetime import date, datetime, timedelta
from pathlib import Path


def main():
    import argparse
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--current', action='store_true', help='Exportar base vigente; conservar cobertura de la carga inicial')
    args = parser.parse_args()
    folder = Path('data')
    manifest = json.loads((folder/'cobertura.json').read_text(encoding='utf-8'))
    payload = json.loads((folder/'expedientes.json').read_text(encoding='utf-8'))
    cursor = date.fromisoformat(manifest['desde'])
    for window in manifest['ventanas']:
        assert date.fromisoformat(window['desde']) == cursor, 'Hueco o solapamiento en cobertura'
        cursor = date.fromisoformat(window['hasta']) + timedelta(days=1)
    assert cursor == date.fromisoformat(manifest['hasta']) + timedelta(days=1)
    rows = payload['expedientes']
    assert len({r['id'] for r in rows}) == len(rows)
    if not args.current:
        assert len(rows) == manifest['total']
    until = manifest['hasta']
    if args.current:
        with closing(sqlite3.connect(folder/'legiscaba.sqlite')) as db:
            until = db.execute('SELECT MAX(hasta) FROM consultas').fetchone()[0]
        assert until, 'Falta una consulta incremental completada'
    for r in rows:
        day = datetime.strptime(r['fecha_presentacion'], '%d/%m/%Y %H:%M:%S').date()
        assert date.fromisoformat(manifest['desde']) <= day <= date.fromisoformat(until)
    with closing(sqlite3.connect(folder/'legiscaba.sqlite')) as db:
        assert db.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'
        assert db.execute('SELECT count(*) FROM expedientes').fetchone()[0] == len(rows)
    projects = [r for r in rows if r['tipo'] in ('LEY','RESOLUCION','DECLARACION')]
    project_payload = {**{k:v for k,v in payload.items() if k!='expedientes'}, 'desde':manifest['desde'],
                       'hasta':until, 'total':len(projects), 'proyectos':projects}
    (folder/'proyectos.json').write_text(json.dumps(project_payload,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    result = {'desde':manifest['desde'], 'hasta':until, 'expedientes':len(rows), 'proyectos':len(projects),
              'por_tipo':dict(Counter(r['tipo'] for r in rows)),
              'expedientes_por_anio_presentacion':dict(Counter(r['fecha_presentacion'].split()[0].split('/')[-1] for r in rows)),
              'proyectos_por_anio_presentacion':dict(Counter(r['fecha_presentacion'].split()[0].split('/')[-1] for r in projects)),
              'autores_distintos':len({r['autor']['id'] for r in projects}),
              'ventanas':len(manifest['ventanas']), 'verificacion_local':'OK'}
    (folder/'resumen.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(result,ensure_ascii=False,indent=2))


if __name__ == '__main__':
    main()
