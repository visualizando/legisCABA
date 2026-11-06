import json
from pathlib import Path
import tempfile
import unittest
from commissions import connect, export, normalize, parse, save, windows
from datetime import date


def meeting(**overrides):
    return normalize({'id_comision_reunion': '20', 'id_comision_agenda_reunion': '10',
        'FechaAgenda': '2026-09-09', 'HoraDefinitiva': '12:00', 'IdComision': '50',
        'NombreComision': 'SOCIAL', 'id_comision_reunion_tipo': '1', **overrides})


class CommissionsTests(unittest.TestCase):
    def test_namespace_and_unexpected_root(self):
        self.assertEqual(parse(b'<ArrayOfEvents xmlns="http://tempuri.org/"><events><id>1</id></events></ArrayOfEvents>', 'ArrayOfEvents'), [{'id': '1'}])
        with self.assertRaises(ValueError):
            parse(b'<html/>', 'ArrayOfEvents')

    def test_windows_do_not_overlap_and_cover_leap_day(self):
        ranges = list(windows(date(2024, 2, 28), date(2024, 3, 2)))
        self.assertEqual(ranges, [(date(2024, 2, 28), date(2024, 3, 1)), (date(2024, 3, 1), date(2024, 3, 3))])

    def test_version_sequence_absence_and_export(self):
        with tempfile.TemporaryDirectory() as directory:
            db = connect(Path(directory) / 'test.sqlite')
            a, b = meeting(), meeting(HoraDefinitiva='13:00')
            for stamp, items in [('a', [a]), ('b', [a]), ('c', [b]), ('d', [a]), ('e', []), ('f', [a])]:
                save(db, items, '2026-09-01', '2026-09-30', stamp)
            self.assertEqual(db.execute('SELECT COUNT(*) FROM versiones').fetchone()[0], 3)
            self.assertEqual(db.execute('SELECT primera_observacion,ultima_observacion,presente FROM reuniones').fetchone(), ('a', 'f', 1))
            self.assertEqual(db.execute('SELECT presente FROM observaciones ORDER BY consulta_id').fetchall(), [(1,), (1,), (1,), (1,), (0,), (1,)])
            output = Path(directory) / 'export.json'
            export(db, output)
            r = json.loads(output.read_text(encoding='utf-8'))['reuniones'][0]
            self.assertNotIn('fuente', r)
            self.assertEqual(r['versiones'], 3)
            self.assertTrue(r['presente'])
            db.close()

    def test_update_is_atomic(self):
        with tempfile.TemporaryDirectory() as directory:
            db = connect(Path(directory) / 'test.sqlite')
            save(db, [meeting()], '2026-09-01', '2026-09-30', 'first')
            with self.assertRaises(KeyError):
                save(db, [{'invalid': True}], '2026-09-01', '2026-09-30', 'bad')
            self.assertEqual(db.execute('SELECT presente FROM reuniones').fetchone()[0], 1)
            self.assertEqual(db.execute('SELECT COUNT(*) FROM consultas').fetchone()[0], 1)
            db.close()
