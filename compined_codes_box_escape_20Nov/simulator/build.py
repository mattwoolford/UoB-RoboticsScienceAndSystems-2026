"""Build the standalone browser simulator from the editable UI, world and controller."""
import argparse
from pathlib import Path
import re
import subprocess
import sys


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--recompile', action='store_true',
                        help='first regenerate engine.js from firmware/BoxEscape (x86 Linux, GCC 14, GNU binutils)')
    args = parser.parse_args()
    sim = Path(__file__).resolve().parent
    if args.recompile:
        subprocess.run([sys.executable, str(sim / 'engine' / 'build_core.py')], check=True)
    html = (sim / 'ui' / 'index.template.html').read_text(encoding='utf-8')
    scripts = {'ENGINE': ('engine/engine.js',), 'WORLD': ('engine/world.js', 'engine/sim.js'), 'UI': ('ui/ui.js',)}
    for key, files in scripts.items():
        marker = '/*__' + key + '__*/'
        if html.count(marker) != 1:
            raise ValueError(f'Expected one {marker} in HTML template')
        script = '\n'.join((sim / file).read_text(encoding='utf-8') for file in files)
        html = html.replace(marker, re.sub(r'</script', lambda m: '<\\/script', script, flags=re.I))
    result = sim / 'index.html'
    result.write_text(html, encoding='utf-8')
    print(f'Built {result.name} ({result.stat().st_size:,} bytes)')


if __name__ == '__main__':
    main()
