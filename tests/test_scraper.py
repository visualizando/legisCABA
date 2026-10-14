import unittest
from pathlib import Path
from scraper import parse_xml

class ParserTest(unittest.TestCase):
    def test_real_response(self):
        records = parse_xml(Path('tests/fixtures/expediente.xml').read_bytes())
        self.assertEqual(records[0]['numero'], '1-D-2026')
        self.assertEqual([x['id'] for x in records[0]['cofirmantes']], ['30561', '30918', '30936'])
        self.assertTrue(records[0]['tiene_sancion'])

    def test_comma_ids(self):
        body = Path('tests/fixtures/expediente.xml').read_text(encoding='utf-8').replace('30561; 30918; 30936', '30561, 30918, 30936')
        self.assertEqual(len(parse_xml(body)[0]['cofirmantes']), 3)

    def test_invalid_response(self):
        with self.assertRaises(ValueError):
            parse_xml('<html/>')

    def test_misaligned_signers(self):
        body = Path('tests/fixtures/expediente.xml').read_text(encoding='utf-8').replace('30561; 30918; 30936', '30561')
        with self.assertRaises(ValueError):
            parse_xml(body)
