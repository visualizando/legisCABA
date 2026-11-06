"""Monthly pipeline. Pack snapshots only after all collectors and exports succeed."""
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
STEPS = [
    ['scraper.py', '--incremental'],
    ['summarize.py', '--current'],
    ['prepare_site.py', '--incremental'],
    ['votes.py', '--incremental'],
    ['commissions.py', '--incremental'],
    ['tools/sync_sessions.py'],
    ['tools/package_data.py', 'pack'],
]


def main():
    for step in STEPS:
        print('> ' + ' '.join(step), flush=True)
        subprocess.run([sys.executable, *step], cwd=ROOT, check=True)


if __name__ == '__main__':
    main()
