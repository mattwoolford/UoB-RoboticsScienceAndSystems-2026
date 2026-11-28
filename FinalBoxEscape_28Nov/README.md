# compined_codes_box_escape_20Nov

This experiment compares one controller on the physical Stamp-C3 robot and in a web browser. The robot drives straight until it finds a wall, follows the wall on its right, and uses wheel odometry to turn into a candidate opening. For the baseline, neither the real nor the simulated escape runs motor calibration. Use the same nominal settings in both. The simulated arena is 400 × 350 mm with a 150 mm opening. This is the single-box experiment, separate from the multi-room Sim5.

**Test 0002 update:** A missed doorway candidate now returns the robot to wall search in the same trial. The raw IR thresholds, motor power and wheel geometry are unchanged. See the [physical baseline and repeat procedure](TRIAL_GUIDE.md#repeat-physical-test-0002).

| What you want to do | What to open |
| --- | --- |
| Upload to the physical robot | On Windows, macOS or Linux, extract the ZIP and open [firmware/BoxEscape/BoxEscape.ino](firmware/BoxEscape/BoxEscape.ino) in Arduino IDE. Keep the complete sketch folder together. See the [upload guide and commands](firmware/START_HERE.md). |
| Start, stop and record the real robot | With the robot on its start mark, join **BoxEscape** Wi-Fi (password **BoxEscapePad**) and open the printed **Web dashboard** address, normally `http://192.168.4.1/`. **Start trial** starts motion and recording together. **Stop trial** ends a run manually. The robot also finishes or stops on a controller fault. |
| Understand an unexpected motion | **Calibration & telemetry** shows the estimated pose, the three raw IR readings and whether forward motor starting power was measured. In **Review**, open **Why did the trial end?** alongside overhead video to investigate a turn, stall or missed opening. |
| Run the simulation without a robot | Open the extracted [simulator/index.html](simulator/index.html) in a browser. This offline page uses the simulated controller and sensors. |
| Change the escape logic | Edit [EscapePilot.cpp](firmware/BoxEscape/EscapePilot.cpp) and [EscapeSettings.h](firmware/BoxEscape/EscapeSettings.h). Rebuild the simulator after changing its shared controller; see [simulator instructions](simulator/README.md). |
| Compare a simulation and a physical escape | Follow the [paired trial guide](TRIAL_GUIDE.md). Open the robot’s `/review` page or [review/index.html](review/index.html) offline to compare CSVs. Use the [trial record](firmware/trial_record.csv) for your measured outcome. |

The same firmware runs on the course Stamp-C3 robot regardless of the device viewing it. The web page uses HTTP on port **80**. Port **8080** is for the existing text terminal, which accepts commands.

**Data:** The dashboard assigns each accepted attempt a test number and makes its CSV available while it is running. After a stop or finish, keep the dashboard connected until it has saved the final CSV in that browser. Download the numbered file (for example, `box-escape-test-0001.csv`) to share it. A live snapshot is incomplete.

**First comparison:** select **Centre** in the simulator and select **Run escape**. Watch the back-right IR during the second left turn. The former rule that stopped escape whenever any sensor read 700 or less has been removed. The controller continues at the observed reading of 472, while front-wall and exit-path checks remain. From the centre the whole body clears the doorway in **21.70 simulated seconds** in the reference model; the wall starts at 20 and 30 mm clearance escape in 6.30 and 6.35 seconds. These are simulation results. A physical escape with this build has not been verified.

The three top IR channels are GPIO0 (back-left), GPIO1 (front) and GPIO4 (back-right). A low reading indicates a stronger return; 4095 alone does not establish that there is an exit. The pilot uses nominal motor commands and encoder geometry. Optional motor calibration is a separate bench experiment. Credits and upstream revisions are in the physical setup guide; see the included [licence](LICENSE).
