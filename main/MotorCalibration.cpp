#include "MotorCalibration.h"

// In-class initialisers define the idle state; construction performs no I2C I/O.
MotorCalibration_c::MotorCalibration_c() = default;

bool MotorCalibration_c::update(Robot_c &robot) {

    // A successful attempt is finished permanently for this instance.
    if (complete) return true;

    if (failed) {
        // A failed write cannot guarantee the physical motors stopped. Retry on
        // every subsequent update, but never resume or report calibration success.
        robot.setMotorPWM(0, 0);
        return false;
    }

    if (!started) {
        // Establish a stopped starting condition before measuring wheel motion.
        if (!robot.setMotorPWM(0, 0)) {
            // The next update enters the failure branch and retries the stop.
            failed = true;
            return false;
        }
        Serial.println("Calibrating motors...");
        started = true;
        step_started = robot.getMillis();
        return false;
    }

    // Allow the initial stop or latest PWM command time to take effect. Unsigned
    // elapsed-time subtraction also works across a millisecond-clock rollover.
    if (robot.getMillis() - step_started < STEP_MS) return false;

    // Never infer motion from stale cached counts after a failed encoder read.
    if (!robot.getEncoders()) {
        failed = true;
        robot.setMotorPWM(0, 0);
        return false;
    }

    // These getters use the fresh snapshot obtained by getEncoders() above.
    const int32_t left = robot.getLeftEncoderCount();
    const int32_t right = robot.getRightEncoderCount();

    // Subtract modulo 2^32 to avoid signed overflow across encoder rollover.
    // For ordinary per-step travel, changes of -1 and -2 become UINT32_MAX and
    // UINT32_MAX-1. Excluding those and 0, 1, 2 accepts at least three net counts
    // in either direction, independent of the encoder's forward polarity.
    const uint32_t left_delta = uint32_t(left) - uint32_t(left_start);
    const uint32_t right_delta = uint32_t(right) - uint32_t(right_start);
    if (pwm > 0) {
        // Ignore motion during initial settling. Latch each wheel only once so
        // its threshold is preserved while the other motor continues ramping.
        if (left_deadband_pwm < 0 && left_delta >= 3 && left_delta <= UINT32_MAX - 2)
            left_deadband_pwm = pwm;
        if (right_deadband_pwm < 0 && right_delta >= 3 && right_delta <= UINT32_MAX - 2)
            right_deadband_pwm = pwm;
    }

    if (left_deadband_pwm >= 0 && right_deadband_pwm >= 0) {
        // Both wheels moved: success also requires an acknowledged stop command.
        complete = robot.setMotorPWM(0, 0);
        failed = !complete;
        if (complete) {
            Serial.println("Motor calibration complete.");
            Serial.println("Left deadband PWM: " + String(left_deadband_pwm));
            Serial.println("Right deadband PWM: " + String(right_deadband_pwm));
        }
        return complete;
    }
    if (pwm >= MAX_PWM) {
        // The maximum step has already been sampled. Bound the ramp even if an
        // encoder is stuck or a wheel cannot move; do not increase PWM further.
        failed = true;
        robot.setMotorPWM(0, 0);
        Serial.println("Motor calibration failed: PWM limit reached");
        return false;
    }

    ++pwm; // Robot_c transmits integer PWM, so fractional steps have no effect.
    // Reset baselines each step: sub-threshold motion from earlier steps must
    // not accumulate and get attributed to the new PWM value.
    left_start = left;
    right_start = right;
    // Only unmeasured motors receive the next test command. A wheel whose
    // threshold was just detected is stopped while the other keeps testing.
    if (!robot.setMotorPWM(left_deadband_pwm < 0 ? pwm : 0,
                           right_deadband_pwm < 0 ? pwm : 0)) {
        // A command failure aborts the attempt and triggers an immediate stop.
        failed = true;
        robot.setMotorPWM(0, 0);
        Serial.println("Motor calibration failed: Motor command failure");
        return false;
    }
    // Time the observation window from acknowledgement of the new command.
    step_started = robot.getMillis();
    // Yield control to the caller until the next update; calibration is ongoing.
    return false;
}
