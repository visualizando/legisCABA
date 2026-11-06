"""Sondeo de fuentes públicas de reuniones; no modifica la base del monitor."""
import argparse
from collections import Counter
from datetime import date, datetime, timedelta, timezone
import json
from pathlib import Path
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

BASE = 'https://parlamentaria.legislatura.gob.ar/webservices/Json.asmx/'
BA = timezone(timedelta(hours=-3))


def records(body, expected):
    root = ET.fromstring(body)
    local = lambda tag: tag.rsplit('}', 1)[-1]
    if local(root.tag) != expected:
        raise ValueError('Respuesta inesperada: ' + root.tag)
    return [{local(c.tag): c.text or '' for c in node} for node in root]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--month', default='2026-09', help='Mes YYYY-MM')
    parser.add_argument('--agenda', default='4804', help='Agenda de control independiente del mes')
    parser.add_argument('--meeting', default='30445', help='Reunión de control dentro de esa agenda')
    parser.add_argument('--output', type=Path, default=Path('experiments/comisiones'))
    args = parser.parse_args()
    first = date.fromisoformat(args.month + '-01')
    last = (first.replace(day=28) + timedelta(days=4)).replace(day=1)
    timestamp = lambda d: int(datetime.combine(d, datetime.min.time(), tzinfo=BA).timestamp())
    params = {'start': timestamp(first), 'end': timestamp(last)}
    args.output.mkdir(parents=True, exist_ok=True)
    evidence = []

    def query(method, values, root, suffix):
        time.sleep(1)
        req = urllib.request.Request(BASE + method,
            data=urllib.parse.urlencode(values).encode(),
            headers={'User-Agent': 'LegisCABA-research/0.1',
                     'Content-Type': 'application/x-www-form-urlencoded'})
        with urllib.request.urlopen(req, timeout=45) as response:
            body = response.read()
        rows = records(body, root)
        filename = method + '_' + suffix + '.xml'
        (args.output / filename).write_bytes(body)
        evidence.append({'metodo': method, 'parametros': values, 'filas': len(rows), 'archivo': filename})
        return rows

    agendas = query('GetAgendasMesCurso', params, 'ArrayOfEvents', args.month)
    events = query('GetAgendasMesCursoEvento', {**params, 'IdTipoReunion': ''}, 'ArrayOfEventsTR', args.month)
    # El servidor devuelve también el día límite: aplicar rango semiabierto local.
    agendas = [r for r in agendas if first.isoformat() <= r['start'] < last.isoformat()]
    events = [r for r in events if first.isoformat() <= r['fecha_agenda'] < last.isoformat()]
    day = query('GetAgendasDiaById', {'idAgenda': args.agenda}, 'ArrayOfEventsDay', args.agenda)
    if not any(r['id_comision_reunion'] == args.meeting for r in day):
        raise ValueError('La reunión de control no pertenece a la agenda')
    items = query('GetExpedientesByIdReunion', {'idReunion': args.meeting}, 'ArrayOfEventsDay', args.meeting)
    if any(r['id_comision_reunion'] != args.meeting or not r.get('id_expediente') for r in items):
        raise ValueError('Temario con identidad inesperada')
    participants = query('GetComisionesParticipantesByIdReunion', {'idReunion': args.meeting}, 'ArrayOfEventsDay', args.meeting)
    result = {
        'consultado_utc': datetime.now(timezone.utc).isoformat(), 'mes': args.month,
        'agendas_en_rango': len(agendas), 'eventos_en_rango': len(events),
        'reuniones_distintas': len({r['id_comision_reunion'] for r in events}),
        'tipos': dict(Counter(r['comision_reunion_tipo'] for r in events)),
        'control': {'agenda': args.agenda, 'reunion': args.meeting,
                    'expedientes_filas': len(items),
                    'expedientes_distintos': len({r['id_expediente'] for r in items}),
                    'comisiones_participantes_filas': len(participants)},
        'consultas': evidence,
    }
    (args.output / 'resultado.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(result, ensure_ascii=True, indent=2))


if __name__ == '__main__':
    main()
