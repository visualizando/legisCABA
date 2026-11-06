"""Offline regressions: persisted history, empty months and interrupted updates."""
from contextlib import closing, redirect_stdout
from datetime import date
import io
import json
import os
from pathlib import Path
import sqlite3
import tempfile
import unittest
from unittest.mock import patch

import scraper
import summarize
import votes
from prepare_site import pending_sessions, retained_session_records
from commissions import connect as commission_db, main as update_commissions
from incremental import pending_start
from tools.sync_sessions import snapshot
from tools import update_data

FIXTURE = Path('tests/fixtures/expediente.xml').read_bytes()


class Today(date):
    @classmethod
    def today(cls):
        return cls(2026, 11, 6)


class IncrementalTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.root = Path(self.directory.name)
        self.cwd = Path.cwd()
        os.chdir(self.root)
        self.addCleanup(self.directory.cleanup)
        self.addCleanup(os.chdir, self.cwd)

    def test_pending_range_covers_missed_months_year_boundary_and_leap_day(self):
        self.assertEqual(pending_start('2025-12-31', '2023-12-10'), date(2025, 12, 25))
        self.assertEqual(pending_start('2024-02-28', '2023-12-10', 0), date(2024, 2, 29))
        self.assertEqual(pending_start(None, '2023-12-10'), date(2023, 12, 10))
        with self.assertRaises(ValueError):
            pending_start('2026-01-01', '2023-12-10', -1)

    def seed_projects(self):
        with patch('sys.argv', ['scraper.py', '--years', '2026', '--number', '1']), \
             patch('scraper.request', return_value=scraper.parse_xml(FIXTURE)), redirect_stdout(io.StringIO()):
            scraper.main()
        Path('data/cobertura.json').write_text(json.dumps({'hasta': '2026-10-01'}))

    def test_projects_migrate_then_accept_empty_month_without_losing_history(self):
        self.seed_projects()
        with patch('sys.argv', ['scraper.py', '--incremental']), patch('scraper.date', Today), \
             patch('scraper.request', return_value=[]) as request, redirect_stdout(io.StringIO()):
            scraper.main()
        self.assertEqual(request.call_args_list[0].args[1]['FechaDesde'], '25/09/2026')
        self.assertEqual(json.loads(Path('data/expedientes.json').read_text(encoding='utf-8'))['total'], 1)
        with closing(sqlite3.connect('data/legiscaba.sqlite')) as db:
            self.assertEqual(db.execute('SELECT hasta FROM consultas').fetchone()[0], '2026-11-06')
        with patch('sys.argv', ['scraper.py', '--incremental']), patch('scraper.date', Today), \
             patch('scraper.request', return_value=[]) as request, redirect_stdout(io.StringIO()):
            scraper.main()
        self.assertEqual(request.call_args_list[0].args[1]['FechaDesde'], '31/10/2026')

    def test_project_failure_does_not_advance_checkpoint_or_export(self):
        self.seed_projects()
        original = Path('data/expedientes.json').read_bytes()
        with patch('sys.argv', ['scraper.py', '--incremental']), patch('scraper.date', Today), \
             patch('scraper.request', side_effect=[[], OSError('offline')]), redirect_stdout(io.StringIO()):
            with self.assertRaises(OSError):
                scraper.main()
        self.assertEqual(Path('data/expedientes.json').read_bytes(), original)
        with closing(sqlite3.connect('data/legiscaba.sqlite')) as db:
            self.assertEqual(db.execute('SELECT COUNT(*) FROM consultas').fetchone()[0], 0)

    def test_current_summary_updates_exports_without_rewriting_historical_coverage(self):
        self.seed_projects()
        manifest={'desde':'2026-03-01','hasta':'2026-10-01','total':1,
                  'ventanas':[{'desde':'2026-03-01','hasta':'2026-10-01'}]}
        Path('data/cobertura.json').write_text(json.dumps(manifest),encoding='utf-8')
        with patch('sys.argv',['scraper.py','--incremental']), patch('scraper.date',Today), \
             patch('scraper.request',return_value=[]), redirect_stdout(io.StringIO()):
            scraper.main()
        with patch('sys.argv',['summarize.py','--current']), redirect_stdout(io.StringIO()):
            summarize.main()
        result=json.loads(Path('data/resumen.json').read_text(encoding='utf-8'))
        self.assertEqual(result['hasta'],'2026-11-06')
        self.assertEqual(result['proyectos'],1)
        self.assertEqual(json.loads(Path('data/cobertura.json').read_text(encoding='utf-8')),manifest)

    def seed_votes(self):
        db = votes.connect('votes.sqlite')
        with db:
            votes.save(db, 'session', 'old', {'id_sesion_lp': 'old', 'fch_sesion_lp': '01/06/2024'}, 'before')
            db.execute('INSERT INTO runs VALUES (?,?,?,?)', ('before', votes.START, '2026-09-30', '{}'))
        db.close()

    def test_vote_empty_period_preserves_history_and_advances_completed_range(self):
        self.seed_votes()
        with patch('sys.argv', ['votes.py', '--incremental', '--until', '2026-11-06', '--db', 'votes.sqlite', '--output', 'votes.json']), \
             patch('votes.fetch', return_value=[]) as fetch, redirect_stdout(io.StringIO()):
            votes.main()
        self.assertEqual(fetch.call_args_list[0].args[1]['FechaDesde'], '24/09/2026')
        self.assertEqual(fetch.call_count, 1)
        result = json.loads(Path('votes.json').read_text(encoding='utf-8'))
        self.assertEqual(result['resumen']['sesiones'], 1)
        with closing(sqlite3.connect('votes.sqlite')) as db:
            self.assertEqual(db.execute('SELECT MAX(until_date) FROM runs').fetchone()[0], '2026-11-06')

    def test_vote_failure_does_not_advance_completed_range(self):
        self.seed_votes()
        with patch('sys.argv', ['votes.py', '--incremental', '--until', '2026-11-06', '--db', 'votes.sqlite']), \
             patch('votes.fetch', side_effect=OSError('offline')):
            with self.assertRaises(OSError):
                votes.main()
        with closing(sqlite3.connect('votes.sqlite')) as db:
            self.assertEqual(db.execute('SELECT COUNT(*) FROM runs').fetchone()[0], 1)

    def test_new_votes_merge_with_history_and_reuse_known_project_metadata(self):
        self.seed_votes()
        ballot={'id_sesion':'old','fecha':'2024-06-01','asunto':'A','expedientes':['10'],
                'positivos':'1','negativos':'0','abstenciones':'0','totales_consistentes':True}
        detail={'id_legislador':'1','legislador_apellido':'TEST','legislador_nombre':'A',
                'votacion_tipo_descripcion':'AFIRMATIVO'}
        with closing(votes.connect('votes.sqlite')) as db, db:
            votes.save(db,'ballot','1',ballot,'before')
            votes.save(db,'votes','1',[detail],'before')
            votes.save(db,'project','10',{'id':'10','numero':'1-D-2024','tipo':'LEY','categoria':'ley','sumario':'A'},'before')
        def response(method, params):
            if method=='GetSesionesAvanzado':
                return [{'id_sesion_lp':'new','fch_sesion_lp':'01/11/2026'}]
            if method=='GetVotacionesAsuntos':
                self.assertEqual(params['IdSesion'],'new')
                return [{**ballot,'id_sesion':'new','id_votacion':'2','id_expediente':'10'}]
            if method=='GetVotaciones':
                self.assertEqual(params['IdVotacionAsunto'],'2')
                return [{**detail,'id_votacion':'2','id_sesion':'new'}]
            if method=='GetLegisladoresBloques':
                return []
            self.fail('Solicitud histórica innecesaria: '+method)
        with patch('sys.argv', ['votes.py','--incremental','--until','2026-11-06','--db','votes.sqlite','--output','votes.json']), \
             patch('votes.fetch',side_effect=response), redirect_stdout(io.StringIO()):
            votes.main()
        result=json.loads(Path('votes.json').read_text(encoding='utf-8'))
        self.assertEqual([b['id'] for b in result['votaciones']],['1','2'])
        self.assertEqual(result['resumen']['votos'],2)
        self.assertEqual(result['votaciones'][1]['categorias'],['ley'])

    def test_session_enrichment_keeps_old_links_and_replaces_recent_links(self):
        previous={'enriquecido':'2026-10-31T12:00:00Z','sesiones_catalogo':['old','empty','recent'],
                  'proyectos':[{'id':'p','sesiones':[{'sesion':'old'},{'sesion':'recent'}]}]}
        sessions=[{'id_sesion_lp':sid,'fch_sesion_lp':day+' 00:00:00'} for sid,day in
                  [('old','01/01/2024'),('empty','02/01/2024'),('recent','30/10/2026'),('late','03/01/2024')]]
        pending=pending_sessions(sessions,previous,'2023-12-10')
        self.assertEqual([s['id_sesion_lp'] for s in pending],['recent','late'])
        self.assertEqual(retained_session_records(previous,pending),{'p':[{'sesion':'old'}]})
        previous.pop('sesiones_catalogo')
        self.assertEqual([s['id_sesion_lp'] for s in pending_sessions(sessions,previous,'2023-12-10')],['recent'])

    def test_commission_resume_uses_last_capture_not_future_agenda_horizon(self):
        with closing(commission_db(Path('commissions.sqlite'))) as db, db:
            db.execute('INSERT INTO consultas(observado,desde,hasta,reuniones) VALUES(?,?,?,?)',
                       ('2026-08-01T12:00:00Z','2023-12-10','2026-09-30',0))
        with patch('sys.argv',['commissions.py','--incremental','--database','commissions.sqlite']), \
             patch('commissions.fetch',side_effect=OSError('offline')) as fetch:
            with self.assertRaises(OSError):
                update_commissions()
        from datetime import datetime, timezone, timedelta
        queried=datetime.fromtimestamp(fetch.call_args.args[1]['start'],timezone(timedelta(hours=-3))).date()
        self.assertEqual(queried,date(2026,7,26))

    def test_session_mirror_preserves_omitted_history_and_accepts_corrections(self):
        previous = {'rows': [{'id_sesion_lp': '1', 'fecha': '2024-01-01', 'dsc_sesion_tipo': 'Ordinaria'},
                             {'id_sesion_lp': '2', 'fecha': '2026-01-01', 'dsc_sesion_tipo': 'Ordinaria'}]}
        result = snapshot(b'id_sesion_lp,fecha,dsc_sesion_tipo\n2,2026-01-02,Especial\n3,2026-11-01,Ordinaria\n', previous)
        self.assertEqual(len(result['rows']), 3)
        self.assertEqual(result['rows'][1]['fecha'], '2026-01-02')
        with self.assertRaises(ValueError):
            snapshot(b'id_sesion_lp,fecha,dsc_sesion_tipo\n', previous)

    def test_pipeline_failure_never_reaches_pack(self):
        with patch('tools.update_data.subprocess.run', side_effect=[None, RuntimeError('failed')]) as run, redirect_stdout(io.StringIO()):
            with self.assertRaises(RuntimeError):
                update_data.main()
        self.assertEqual(run.call_count, 2)
