#!/usr/bin/env python3
"""Compile the complete PDE sketch and test its actual Java model headlessly."""
import argparse
import os
from pathlib import Path
import subprocess
import tempfile

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--processing-resources', type=Path,
                    default=Path('/Applications/Processing.app/Contents/app/resources'))
parser.add_argument('--output-csv', type=Path, help='Optionally retain the verified baseline CSV')
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
resources = args.processing_resources.resolve()
java = resources / 'jdk/bin/java'
javac = resources / 'jdk/bin/javac'
mode = resources / 'modes/java/mode'
net = resources / 'modes/java/libraries/net/library/net.jar'
with tempfile.TemporaryDirectory(prefix='digital-twin-') as temporary:
    build = Path(temporary) / 'build'
    subprocess.run([str(java), '-Djava.awt.headless=true',
                    f'-Dcompose.application.resources.dir={resources}',
                    '-cp', str(mode / '*'), 'processing.mode.java.Commander',
                    f'--sketch={root / "DigitalTwin"}', f'--output={build}', '--build'], check=True)
    classpath = os.pathsep.join([str(build), str(mode / '*'), str(net)])
    subprocess.run([str(javac), '-cp', classpath, '-d', str(build),
                    str(root / 'tests/HeadlessDigitalTwinTest.java')], check=True)
    output = args.output_csv.resolve() if args.output_csv else Path(temporary) / 'baseline.csv'
    subprocess.run([str(java), '-Djava.awt.headless=true', '-cp', classpath,
                    'HeadlessDigitalTwinTest', str(output), temporary], check=True)
