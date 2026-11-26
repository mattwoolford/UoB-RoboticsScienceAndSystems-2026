#ifndef DRIFT_CORRECTION_H
#define DRIFT_CORRECTION_H

#include "OdometryModel.h"
#include "DriftSettings.h"

/** Encoder feedback for one straight forward run. Positive trim speeds up the left wheel. */
class DriftCorrection_c {
public:
    void beginRun(const DriftSettings& settings) {
        run_settings = settings;
        tracking = false;
    }
    float trimPWM(const OdometryModel_c& odometry, unsigned long now);

private:
    DriftSettings run_settings{};
    bool tracking = false;
    OdometryModel_c::Pose origin{};
    unsigned long last_ms = 0;
    float integral_pwm = 0;
    float normal_x = 0, normal_y = 1;
};

#endif
