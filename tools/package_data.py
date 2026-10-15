"""Mantiene snapshots comprimidos en Git; Pages publica JSON sin comprimir."""
import argparse
import gzip
from pathlib import Path

FILES=['data/expedientes.json','data/legiscaba.sqlite','site/data/monitor.json',
       'data/votaciones.sqlite','site/data/votaciones.json']


def main():
    p=argparse.ArgumentParser();p.add_argument('mode',choices=['pack','unpack']);args=p.parse_args()
    for filename in FILES:
        path=Path(filename); archive=Path(filename+'.gz')
        if args.mode=='pack':
            if not path.exists():continue
            content=gzip.compress(path.read_bytes(),mtime=0)
            archive.write_bytes(content)
            print(f'{archive}: {len(content)} bytes')
        elif archive.exists():
            path.write_bytes(gzip.decompress(archive.read_bytes()))


if __name__=='__main__':main()
