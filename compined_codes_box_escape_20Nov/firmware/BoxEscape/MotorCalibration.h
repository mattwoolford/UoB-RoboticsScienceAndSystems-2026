#ifndef ROBOTICSSCIENCEANDSYSTEMS_MOTORCALIBRATION_H
#define ROBOTICSSCIENCEANDSYSTEMS_MOTORCALIBRATION_H

#include "Robot.h"

/**
 * @brief Measures the forward starting PWM threshold of each wheel independently.
 *
 * Both unmeasured motors receive a rising positive PWM command. Each motor is
 * stopped once its encoder changes by at least three counts during one step.
 * This is a practical deadband estimate under the current load, battery level,
 * and sampling interval; it does not measure reverse or stopping thresholds.
 * Each instance performs one attempt and retains its results or failure state.
 */
class MotorCalibration_c {
public:
    /** @brief Creates an idle calibration with both thresholds unmeasured. */
    MotorCalibration_c();

    /**
     * @brief Advances calibration without waiting in a loop or calling delay().
     * @param robot Initialised hardware interface, passed by reference so its
     * encoder and motor-command caches remain shared with the caller.
     * @return true only when both thresholds are found and the final stop is
     * acknowledged; false means still running or failed (see hasFailed()).
     *
     * Call frequently with exclusive control of the motors: no driving
     * controller or other motor-command producer should run concurrently.
     * The first call stops the wheels and starts a settling interval. Later
     * calls sample encoders after at least STEP_MS, then advance the PWM.
     * Sparse calls lengthen the measurement windows and can affect results.
     * After failure, keep calling to retry the stop if communication recovers.
     * Successful completion is latched; later calls send no further commands.
     */
    bool update(Robot_c &robot);
    /** @brief Reports a latched I2C failure or no movement by the PWM limit. */
    bool hasFailed() const { return failed; }

    /**
     * @brief First tested positive left PWM producing at least three net counts.
     * @return -1 until detected. Use the result pair only after update succeeds;
     * a partial result can remain available after a failed attempt.
     */
    int16_t getLeftDeadbandPWM() const { return left_deadband_pwm; }
    /** @brief Right-wheel threshold, with the same validity rules as the left. */
    int16_t getRightDeadbandPWM() const { return right_deadband_pwm; }

private:
    /** @brief Maximum positive PWM tested before declaring no-motion failure. */
    static constexpr int16_t MAX_PWM = 100;
    /** @brief Minimum settling time and minimum duration of each PWM step. */
    static constexpr unsigned long STEP_MS = 300;
    /** @brief Latched left threshold; -1 means no movement detected yet. */
    int16_t left_deadband_pwm = -1;
    /** @brief Latched right threshold; -1 means no movement detected yet. */
    int16_t right_deadband_pwm = -1;
    /** @brief Current test PWM; zero denotes the initial settling phase. */
    int16_t pwm = 0;
    /** @brief Left encoder baseline captured immediately before each PWM step. */
    int32_t left_start = 0;
    /** @brief Right encoder baseline captured immediately before each PWM step. */
    int32_t right_start = 0;
    /** @brief Millisecond timestamp marking the start of the current interval. */
    unsigned long step_started = 0;
    /** @brief True after the initial stop has been acknowledged. */
    bool started = false;
    /** @brief Latched failure; subsequent updates only attempt to stop motors. */
    bool failed = false;
    /** @brief Latched success, including acknowledgement of the final stop. */
    bool complete = false;
};

#endif
