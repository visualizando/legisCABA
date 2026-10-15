import unittest
from vote_lineages import build_lineages


def periods(old, new=None):
    result=[{'id_bloque':old,'bloque':'Bloque '+old,'desde':'2021-01-01','hasta':'2023-12-09' if new else None}]
    if new:
        result.append({'id_bloque':new,'bloque':'Bloque '+new,'desde':'2023-12-10','hasta':None})
    return result


class LineagesTest(unittest.TestCase):
    def test_collective_rename_and_retirement(self):
        retired=[{'id_bloque':'10','bloque':'Bloque 10','desde':'2021-01-01','hasta':'2023-12-09'}]
        result=build_lineages({'a':periods('10','20'),'b':periods('10','20'),'c':retired},{})
        self.assertEqual(result['bloque_trayectoria']['10'],result['bloque_trayectoria']['20'])
        transition=result['continuidades'][0]
        self.assertEqual(transition['continuaban_origen'],2)
        self.assertEqual(transition['proporcion_origen'],1)

    def test_split_is_not_a_rename(self):
        result=build_lineages({'a':periods('10','20'),'b':periods('10','20'),'c':periods('10'),'d':periods('10')},{})
        self.assertNotEqual(result['bloque_trayectoria']['10'],result['bloque_trayectoria']['20'])

    def test_merger_is_not_two_renames(self):
        result=build_lineages({'a':periods('10','20'),'b':periods('10','20'),'c':periods('30','20'),'d':periods('30','20')},{})
        self.assertNotEqual(result['bloque_trayectoria']['10'],result['bloque_trayectoria']['20'])
        self.assertNotEqual(result['bloque_trayectoria']['30'],result['bloque_trayectoria']['20'])

    def test_pro_reference_keeps_its_historical_names(self):
        result=build_lineages({'a':periods('83','86'),'b':periods('119')},{})
        self.assertEqual(result['bloque_trayectoria']['83'],'119')
        self.assertEqual(result['bloque_trayectoria']['86'],'119')
