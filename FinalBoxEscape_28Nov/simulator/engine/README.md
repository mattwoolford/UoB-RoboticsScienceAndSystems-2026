# Browser binding for the combined physical sketch

The live browser loads engine.js as a classic script. It uses no remote compiler, fetch, WebAssembly download or native app. The robot's decisions come from the compiled C++ in Controller.cpp, EscapePilot.cpp, OdometryModel.cpp, MotorCalibration.cpp, DriftCorrection.cpp, TopIR.cpp and TaskTimer.cpp; these seven source files were not ported by hand. BOX_ESCAPE_ENABLE is 1 in the supplied physical and virtual builds.

To rebuild with Python 3, GCC 14 and GNU binutils on x86 Linux:

    python3 build_core.py /path/to/BoxEscape ./engine.js

GCC builds an isolated freestanding 32-bit object. The tool translates the small set of scalar and vector instructions emitted for these particular firmware files into switch blocks and typed-memory operations. It rejects unknown instructions. This is a build step, not a generic interpreter for external programs. The browser-facing runner only executes the compiled-in controller. A different compiler version may need additional instruction handling. The Arduino/robot stubs supply the simulated millisecond clock, IR values, encoder counts and PWM, and suppress USB print output. The calculated pose is the C++ encoder estimate relative to each command start; it is distinct from the plant's world pose. ADC timing is idealized; scan_us is not a measured timing result. The browser does not access the physical robot or its wireless network.

Programmatic interface:

    const fw = new BoxCore();  // IDLE at virtual time 0
    fw.setInputs({leftTicks:0, rightTicks:0, backLeft:4095, front:4095, backRight:4095});
    fw.command("E");   // Uncalibrated escape from idle
    fw.tick(10, {leftTicks:0, rightTicks:0, backLeft:4095, front:4095, backRight:4095});
    const state = fw.snapshot();

Call tick at 10 ms steps and feed the simulated counts and raw channels. Use a fresh BoxCore for a fresh boot. Forward wheel count is positive; CCW heading is positive. S/T/L/P/G/V/E/X retain the sketch's behaviour; E starts with the nominal drive/turn settings without running or requiring forward calibration. The optional straight/turn bench tests still require it. This binding does not duplicate BoxEscape.ino's Wi-Fi/serial text parsing; the user interface invokes Controller_c::command directly. No changes to the physical firmware are needed.
