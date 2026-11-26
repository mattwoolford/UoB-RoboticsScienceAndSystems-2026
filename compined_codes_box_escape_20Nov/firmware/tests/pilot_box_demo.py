"""Run packaged pilot with shipped and fixture-specific settings. No robot required.
This model uses approximate older IR curves and perfect odometry. It does not
test real wheels, allow real motor use or change anything in the Arduino sketch.
"""
from pathlib import Path
from tempfile import TemporaryDirectory
import shutil, subprocess, re, sys, os
compiler = next((v for name in ("c++","g++","clang++") if (v := shutil.which(name))), None)
if not compiler: raise SystemExit("Install a C++17 compiler (g++ or clang++) to run host tests.")

tests = Path(__file__).resolve().parent
pilot = tests.parent / "BoxEscape"
demo = tests / "pilot_box_demo.cpp"

def run(label, settings, trace=False):
    with TemporaryDirectory(prefix="hamad-box-smoke-") as tmp:
        work = Path(tmp)
        for name in ("EscapePilot.h", "EscapePilot.cpp", "EscapeSettings.h"):
            shutil.copy(pilot / name, work / name)
        cfg = work / "EscapeSettings.h"
        s = cfg.read_text()
        for k, val in settings.items():
            s, n = re.subn(r"(\b"+re.escape(k)+r"\s*=\s*)[0-9.]+(?:f)?\b",
                           lambda m: m[1]+val, s)
            if n != 1: raise ValueError("Missing or ambiguous pilot setting: "+k)
        cfg.write_text(s)
        exe = work / ("run.exe" if os.name=="nt" else "run")
        subprocess.run([compiler, "-std=c++17", "-O2", "-I", str(work), str(demo),
                        str(work / "EscapePilot.cpp"), "-o", str(exe)], check=True)
        print("\n"+label + (": " + str(settings) if settings else ""), flush=True)
        subprocess.run([str(exe)]+(["trace"] if trace else []), check=True)

if __name__ == "__main__":
    run("Shipped geometry and thresholds", {}, "--trace" in sys.argv)
    run("Sensitivity check: much later rear-sensor response (temporary settings; not hardware calibration)",
        {"RIGHT_EDGE_RAW":"3950","RIGHT_OPEN_RAW":"4000","EDGE_TO_AXLE_OFFSET_MM":"60.0f"}, "--trace" in sys.argv)
