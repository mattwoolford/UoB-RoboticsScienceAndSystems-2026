"""Compile the sketch as C++17 and exercise it with a fake 3Pi+ middleware and ADC.
Needs Python 3 and c++ (g++/clang++). This does not build ESP32 firmware or model IR optics.
"""
from pathlib import Path
from tempfile import TemporaryDirectory
import os, shutil, subprocess
compiler = next((v for name in ("c++","g++","clang++") if (v := shutil.which(name))), None)
if not compiler: raise SystemExit("Install a C++17 compiler (g++ or clang++) to run host tests.")
here=Path(__file__).resolve().parent
sketch=here.parent/'BoxEscape'
with TemporaryDirectory(prefix='boxescape-tests-') as td:
    for enabled in (0, 'default'):
        config = ['-DTEST_DEFAULT_ENABLED'] if enabled == 'default' else ['-DBOX_ESCAPE_ENABLE=0']
        executable=Path(td)/('combined-host-'+str(enabled)+('.exe' if os.name=='nt' else ''))
        subprocess.run([compiler,*config,'-std=c++17','-O1','-Wall','-Wextra','-I',str(here/'fakes'),'-I',str(sketch),
        '-x','c++',str(sketch/'BoxEscape.ino'),*map(str,sorted(sketch.glob('*.cpp'))),str(here/'test.cpp'),
        '-o',str(executable)],check=True)
        subprocess.run([str(executable)],check=True)
        if enabled == 'default':
            for scenario in ('locked', 'persisted'):
                subprocess.run([str(executable),scenario],check=True)
