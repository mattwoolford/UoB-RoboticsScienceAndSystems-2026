#include "DriftCorrection.h"

#include <cmath>

namespace {
constexpr float HEADING_GAIN = 200.0f;        // PWM per radian
constexpr float INTEGRAL_GAIN = 200.0f;       // PWM per radian-second
constexpr float MAX_TRIM_PWM = 30.0f;         // nominal forward PWM is at least 100
}

float DriftCorrection_c::trimPWM(const OdometryModel_c& odometry, unsigned long now) {
    if (!run_settings.correction) return 0;
    const auto& pose = odometry.pose;
    if (!tracking) {
        origin = pose;
        if (run_settings.pathRecovery) {
            normal_x = -sinf(origin.theta);
            normal_y = cosf(origin.theta);
        }
        last_ms = now;
        integral_pwm = 0;
        tracking = true;
        return 0;
    }

    // Odometry derives heading from (right travel - left travel) / axle width.
    float error = pose.theta - origin.theta;
    if (run_settings.pathRecovery) {
        // Aim at a point on the start line one lookahead distance ahead of the axle.
        constexpr float LOOKAHEAD_MM = 75.0f;
        const float cross_track_mm = (pose.x - origin.x) * normal_x + (pose.y - origin.y) * normal_y;
        error += atan2f(cross_track_mm, LOOKAHEAD_MM);
    } else {
        // Allow for asynchronous encoder ticks before treating a mismatch as drift.
        constexpr float PI_F = 3.14159265f;
        const float tick_angle = PI_F * (odometry.leftWheelRadiusMm + odometry.rightWheelRadiusMm)
                                 / (odometry.encoderCountsPerRevolution * odometry.wheelSeparationMm);
        if (fabsf(error) < 2.5f * tick_angle) error = 0;
    }

    // Retain a bias for sustained motor mismatch. Limit integration after a
    // gap in acquisition and stop integrating further into output saturation.
    const float dt = fminf((now - last_ms) * 0.001f, 0.1f);
    last_ms = now;
    const float proportional = HEADING_GAIN * error;
    const float candidate = integral_pwm + INTEGRAL_GAIN * error * dt;
    const float demand = proportional + candidate;
    if ((demand <= MAX_TRIM_PWM || error < 0) && (demand >= -MAX_TRIM_PWM || error > 0)) {
        integral_pwm = fmaxf(-MAX_TRIM_PWM, fminf(candidate, MAX_TRIM_PWM));
    }
    // Robot_c truncates PWM. Round the trim once so both wheels change equally.
    return roundf(fmaxf(-MAX_TRIM_PWM, fminf(proportional + integral_pwm, MAX_TRIM_PWM)));
}
