"""Experimentos reproducibles; guarda respuestas sin modificar la base del monitor."""
import concurrent.futures
import json
import time
import urllib.parse
import urllib.request
from pathlib import Path
from scraper import BASE, parse_xml

OUT = Path('experiments')
DEFAULT = dict(IdProyectoTipo='', IdAutoresInternos='', IdUbicacion='', IdEstado='',
               Sumario='', SumarioExacto='0', FechaDesde='', FechaHasta='', AnioParlamentario='2026', Limite='')


def probe(case):
    name, method, overrides = case
    params = {**DEFAULT, **overrides} if method.startswith('Json') else overrides
    start = time.monotonic()
    result = {'caso': name, 'metodo': method, 'parametros': params}
    try:
        req = urllib.request.Request(BASE + 'webservices/' + method,
            data=urllib.parse.urlencode(params).encode(),
            headers={'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'LegisCABA-research/0.1'})
        with urllib.request.urlopen(req, timeout=40) as response:
            body = response.read()
        (OUT / (name + '.xml')).write_bytes(body)
        result['bytes'] = len(body)
        if method.startswith('Json'):
            records = parse_xml(body)
            result.update(total=len(records), ids=[r['id'] for r in records],
                          incluye_control=any(r['id'] == '139330' for r in records),
                          fechas=[r['fecha_presentacion'] for r in records])
        else:
            result['respuesta'] = body.decode('utf-8')
    except Exception as exc:
        result['error'] = str(exc)
    result['segundos'] = round(time.monotonic() - start, 2)
    (OUT / (name + '.json')).write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({k:v for k,v in result.items() if k not in ('ids','fechas','respuesta','parametros')}, ensure_ascii=False), flush=True)
    return result


if __name__ == '__main__':
    OUT.mkdir(exist_ok=True)
    cases = [
        ('autor_correcto', 'Json.asmx/GetExpedienteAvanzada', {'IdAutoresInternos': '65883'}),
        ('fecha_dia_2', 'Json.asmx/GetExpedienteAvanzada', {'FechaDesde':'02/03/2026', 'FechaHasta':'02/03/2026', 'AnioParlamentario':''}),
        ('fecha_dia_3', 'Json.asmx/GetExpedienteAvanzada', {'FechaDesde':'03/03/2026', 'FechaHasta':'03/03/2026', 'AnioParlamentario':''}),
        ('autores_todos', 'AutoCompletar.asmx/GetAutores', {'prefixText':'', 'count':'1000'}),
    ]
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(probe, cases))
    (OUT / 'resumen.json').write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding='utf-8')
