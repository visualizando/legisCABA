import json
import unittest
from votes import connect, historical_block, records, save, unique_votes


class VotesTest(unittest.TestCase):
    def test_multi_project_vote_is_counted_once_and_conflicts_are_marked(self):
        rows = [{'id_legislador':'1','votacion_tipo_descripcion':'AFIRMATIVO','id_expediente':'a'},
                {'id_legislador':'1','votacion_tipo_descripcion':'AFIRMATIVO','id_expediente':'b'}]
        self.assertEqual(len(unique_votes(rows)), 1)
        rows.append({'id_legislador':'1','votacion_tipo_descripcion':'NEGATIVO'})
        self.assertEqual(unique_votes(rows)[0]['votacion_tipo_descripcion'], 'INCONSISTENTE')

    def test_block_is_historical_and_missing_period_is_not_guessed(self):
        periods = [{'desde':'2024-01-01','hasta':'2025-01-01','id_bloque':'a'},
                   {'desde':'2025-01-01','hasta':None,'id_bloque':'b'}]
        self.assertEqual(historical_block(periods, '2024-12-31')['id_bloque'], 'a')
        self.assertEqual(historical_block(periods, '2025-01-01')['id_bloque'], 'b')
        self.assertIsNone(historical_block(periods, '2023-12-30'))

    def test_refresh_is_idempotent_and_preserves_corrections_and_other_votes(self):
        db = connect(':memory:')
        with db:
            save(db,'votes','1',{'voto':'AFIRMATIVO'},'a')
            save(db,'votes','1',{'voto':'AFIRMATIVO'},'b')
            save(db,'votes','2',{'voto':'ABSTENCIÓN'},'b')
            save(db,'votes','1',{'voto':'NEGATIVO'},'c')
        self.assertEqual(db.execute('SELECT count(*) FROM observations').fetchone()[0], 3)
        self.assertEqual(db.execute('SELECT count(*) FROM current').fetchone()[0], 2)
        self.assertEqual(json.loads(db.execute("SELECT payload FROM current WHERE id='1'").fetchone()[0])['voto'], 'NEGATIVO')
        with self.assertRaises(RuntimeError):
            with db:
                save(db,'votes','1',{'voto':'otro'},'d')
                raise RuntimeError('descarga incompleta')
        self.assertEqual(db.execute('SELECT count(*) FROM observations').fetchone()[0], 3)
        db.close()

    def test_source_error_is_not_an_empty_valid_response(self):
        with self.assertRaises(ValueError):
            records('<Respuesta><status><esError>true</esError></status></Respuesta>')
        self.assertEqual(records('<Array />'), [])
        self.assertEqual(records('<Respuesta><status><esError>false</esError></status><datos><LegisladorBloque><id_bloque>119</id_bloque></LegisladorBloque></datos></Respuesta>'), [{'id_bloque':'119'}])
