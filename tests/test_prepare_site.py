import unittest
from prepare_site import category, rows

class ClassificationTest(unittest.TestCase):
    def test_reports_starting_sumario(self):
        self.assertEqual(category({'tipo':'RESOLUCION','sumario':'INFORMES REFERIDOS A LAS ESCUELAS'}),'informes')
        self.assertEqual(category({'tipo':'RESOLUCION','sumario':'SOLICÍTASE AL PE UN INFORME SOBRE EL TRANSPORTE'}),'informes')

    def test_other_resolutions_and_official_types(self):
        self.assertEqual(category({'tipo':'RESOLUCION','sumario':'RECONOCIMIENTO A UNA INVESTIGACIÓN SOBRE INFORMES'}),'resolucion')
        self.assertEqual(category({'tipo':'DECLARACION','sumario':'INFORMES REFERIDOS A LAS ESCUELAS'}),'declaracion')
        self.assertEqual(category({'tipo':'LEY','sumario':'CREACIÓN DE UN SISTEMA DE INFORMES'}),'ley')

    def test_source_error(self):
        with self.assertRaises(ValueError):
            rows('<Respuesta><status><esError>true</esError></status></Respuesta>','fila')
