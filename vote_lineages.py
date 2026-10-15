"""Continuidades de bloque inferidas por movimientos colectivos y auditables."""
from collections import defaultdict
from datetime import date, timedelta


def block_at(periods, day):
    valid = [p for p in periods if p['desde'] and p['desde'] <= day and (not p['hasta'] or day <= p['hasta'])]
    valid.sort(key=lambda p:p['desde'], reverse=True)
    if len(valid)>1 and valid[0]['desde']==valid[1]['desde'] and valid[0]['id_bloque']!=valid[1]['id_bloque']:
        return None
    return valid[0]['id_bloque'] if valid else None


def build_lineages(histories, names):
    names = dict(names)
    days = set()
    for periods in histories.values():
        for p in periods:
            names[p['id_bloque']] = p['bloque']
            if p['desde'] and p['desde'] >= '2021-01-01':
                days.add(p['desde'])
    parent = {bid:bid for bid in names}
    def root(bid):
        while parent[bid] != bid:
            bid = parent[bid]
        return bid
    evidence = []
    for day in sorted(days):
        before = (date.fromisoformat(day)-timedelta(days=1)).isoformat()
        moves = defaultdict(list)
        continuing_from = defaultdict(set)
        continuing_to = defaultdict(set)
        for pid, periods in histories.items():
            a,b = block_at(periods,before),block_at(periods,day)
            if a and b:
                continuing_from[a].add(pid); continuing_to[b].add(pid)
                if a != b:
                    moves[a,b].append(pid)
        for (a,b), ids in moves.items():
            source_ratio = len(ids)/len(continuing_from[a])
            target_ratio = len(ids)/len(continuing_to[b])
            # Both directions matter: a whole group joining a larger merger is not a rename.
            accepted = len(ids)>=2 and source_ratio>=.8 and target_ratio>=.8
            if len(ids)>=2:
                evidence.append({'desde':a,'hacia':b,'fecha':day,'legisladores':sorted(ids),
                    'nombre_origen':names[a],'nombre_destino':names[b],
                    'continuaban_origen':len(continuing_from[a]),'continuaban_destino':len(continuing_to[b]),
                    'proporcion_origen':source_ratio,'proporcion_destino':target_ratio,'unificados':accepted})
            if accepted:
                parent[root(a)] = root(b)
    # The user fixes PRO as the governing reference throughout its historical names.
    for bid in ('7','83','86'):
        if bid in parent and '119' in parent:
            parent[root(bid)] = root('119')
    for row in evidence:
        if row['desde'] in ('7','83','86','119') and row['hacia'] in ('7','83','86','119'):
            row['unificados'] = True
            row['criterio'] = 'Continuidad del PRO indicada por el usuario'
    groups = defaultdict(list)
    for bid in names:
        groups[root(bid)].append(bid)
    latest = defaultdict(str)
    for periods in histories.values():
        for p in periods:
            latest[p['id_bloque']] = max(latest[p['id_bloque']], p['desde'] or '')
    lineages = {}
    mapping = {}
    for ids in groups.values():
        ids.sort(key=lambda bid:(latest[bid],int(bid)))
        lid = '119' if '119' in ids else ids[-1]
        lineages[lid] = {'nombre':names[lid],'bloques':ids,'alias':[names[bid] for bid in ids]}
        for bid in ids:
            mapping[bid] = lid
    return {'continuidades':evidence, 'trayectorias':lineages, 'bloque_trayectoria':mapping}
