# Browser simulator

The escape experiment starts with the nominal settings and skips motor calibration, matching a fresh physical robot. Calibrate remains a separate bench experiment.

On a laptop (Windows, macOS or Linux), extract the ZIP, then open `simulator/index.html` in a modern browser. Choose **Centre** and select **Run escape**. The page runs offline; no Arduino tools or robot connection are needed. A tablet or phone browser can use the same HTML; if the file manager shows a preview instead of running the page, open it with a browser or serve it as a static page. On GitHub, clicking the HTML file shows its source.

To compare with a real escape, run the same starting pose and controller settings, then select **Run escape**. Recording starts immediately; **Download partial CSV** is available during the trial. **Pause** lets you resume the same trial. **Stop trial** ends it, and a stopped or completed trial automatically downloads `box-escape-sim-test-0001.csv`, then `0002`, etc. Use **Download final CSV** if the browser blocks the download. Reset is disabled during an active or paused trial. The last completed file remains available after Reset or during the next run while the page is open. Numbering is local to this browser and simulator location; use one tab for a series. If browser storage is blocked, numbering lasts for that session and filenames also include a timestamp. Real and simulated test numbers are independent. Open [review/index.html](../review/index.html) and import both the simulated CSV and the robot’s `/trial.csv`. See the [paired trial guide](../TRIAL_GUIDE.md).

A rejected doorway candidate returns the controller to wall search. There is no global escape-search timeout: use **Stop trial** if it keeps circling. During a long search the simulator keeps about 8,000 recent rows (roughly six minutes at 20 Hz); `trimmed=1` means older rows were dropped. Download a partial CSV during the run to keep earlier rows. The simulator can independently detect the model touching cardboard and end that run as **CONTACT**. On the physical robot, confirm contact or a successful escape from observation or video.

For **live readings from the physical robot**, use the [firmware setup guide](../firmware/START_HERE.md) and the web address printed by the powered robot.

| If you change… | Edit | Rebuild from the project folder |
| --- | --- | --- |
| Controls or display | `simulator/ui/` | `python3 simulator/build.py` |
| Virtual box, sensors, or motion model | `simulator/engine/world.js` and `simulator/engine/sim.js` | `python3 simulator/build.py` |
| Shared C++ controller | `firmware/BoxEscape/` | `python3 simulator/build.py --recompile` |

The C++ rebuild uses x86 Linux, GCC 14 and GNU binutils. See [engine notes](engine/README.md) for the hardware assumptions. People running the simulation only need the finished HTML file.

After rebuilding, run `node simulator/tests/presets.js` from the project folder to check the example trials, then commit the changed sources and generated files together.
