"""Build independent native oracle against the combined robot source and fake hardware."""
from pathlib import Path
import subprocess
import tempfile
import sys
root=Path(__file__).resolve().parent
pkg=root.parents[1]/'firmware'
sources=pkg/'BoxEscape'
# The oracle compares motion behavior; the Wi-Fi dashboard and storage are independent.
motion=('Controller','DriftCorrection','EscapePilot','MotorCalibration','OdometryModel','Robot','TaskTimer','TopIR')
with tempfile.TemporaryDirectory() as td:
    exe=Path(td)/'oracle'
    subprocess.run(['c++','-std=c++17','-O1','-DBOX_ESCAPE_ENABLE=1','-I'+str(pkg/'tests/fakes'),'-I'+str(sources),
                   str(root/'reference.cpp'),*[str(sources/(name+'.cpp')) for name in motion],'-o',str(exe)],check=True)
    if len(sys.argv)>1:
        with Path(sys.argv[1]).open('w') as out:
            subprocess.run([str(exe)],stdout=out,check=True)
    else:subprocess.run([str(exe)],check=True)
