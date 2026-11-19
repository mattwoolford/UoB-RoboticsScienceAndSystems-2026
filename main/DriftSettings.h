#ifndef DRIFT_SETTINGS_H
#define DRIFT_SETTINGS_H

// Factory defaults when the flashed settings partition contains no overrides.
#ifndef ROBOT_DRIFT_CORRECTION
#define ROBOT_DRIFT_CORRECTION 0
#endif
#ifndef ROBOT_DRIFT_PATH_RECOVERY
#define ROBOT_DRIFT_PATH_RECOVERY 0
#endif

struct DriftSettings {
    bool correction = ROBOT_DRIFT_CORRECTION;
    bool pathRecovery = ROBOT_DRIFT_PATH_RECOVERY;
};

/** Reads the saved pair, or the build defaults after a project flash.
 * On storage error leaves settings unchanged and returns false.
 */
bool loadDriftSettings(DriftSettings& settings);
/** Atomically persists both flags. Returns true once NVS confirms the commit. */
bool saveDriftSettings(const DriftSettings& settings);

#endif
