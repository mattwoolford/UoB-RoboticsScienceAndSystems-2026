#ifndef CONTROLLER_H
#define CONTROLLER_H

#include "Robot.h"
#include "RobotWifiAP.h"
#include "TaskTimer.h"
#include "OdometryModel.h"
#include "MotorCalibration.h"
#include "DriftCorrection.h"

/**
 * @brief Supplies the nominal line-following controller for the StampC3 example.
 *
 * Controller_c owns the controller state, while Robot_c owns the latest hardware
 * snapshot and RobotWifiAP_c owns optional telemetry transport. Students may read
 * or replace this controller, but should treat its constants as a demonstrator
 * baseline rather than a calibration of every physical robot.
 */
class Controller_c {
  
  public:
    /** @brief Editable local encoder-to-pose model; inspect odometry.pose.
     * @note Controller mode resets do not reset this estimate. Use
     * odometry.reset(...) explicitly to start a new physical trial.
     */
    OdometryModel_c odometry;

    /** @brief Fastest interval between controller and I2C acquisition cycles. */
    static const unsigned long UPDATE_INTERVAL_MS = 10;
    /** @brief Interval between telemetry records in milliseconds. */
    static const unsigned long TELEMETRY_INTERVAL_MS = 50;
    /** @brief Maximum line-search duration before the controller stops. */
    static const unsigned long RECOVERY_TIMEOUT_MS = 5000;
    /** @brief Surface-reading threshold used to decide whether a line is present. */
    static const uint16_t LINE_THRESHOLD = 1400;
    /** @brief Nominal forward PWM bias for line following. */
    static constexpr float BASE_PWM = 45.0f;
    /** @brief Equal PWM for physical open-loop runs and minimum for motor tests. */
    static constexpr float CONSTANT_PWM = 100.0f;
    /** @brief Proportional gain applied to the DN2-minus-DN4 surface error. */
    static constexpr float LINE_FOLLOW_GAIN = 0.01f;
    /** @brief Left PWM used during the one-direction line-search rotation. */
    static constexpr float RECOVERY_LEFT_PWM = -35.0f;
    /** @brief Right PWM used during the one-direction line-search rotation. */
    static constexpr float RECOVERY_RIGHT_PWM = 35.0f;

    /** @brief Creates a controller in its waiting state. */
    Controller_c();

    /** @brief Clears signal and mode state, returning the controller to waiting.
     * @note This also prepares a new motor calibration attempt for update().
     * It does not reset the task timers or the local odometry estimate.
     * It sends no motor command: returning to waiting does not stop the motors.
     * Send robot.setMotorPWM(0, 0) separately and check the command result.
     */
    void reset();

    /**
     * @brief Returns whether the controller has received its start signal.
     * @return Zero while waiting; one after the button or caller starts it.
     */
    uint8_t getSignal() const;

    /** @brief True when calibration succeeded and the procedure is waiting.
     * Used by both start gating and button feedback so their conditions agree.
     */
    bool isReadyToStart() const;

    /**
     * @brief Starts the controller or resets it to waiting.
     * @param requested_signal Zero resets to waiting without sending a motor stop;
     * a non-zero value starts only when isReadyToStart() is true.
     * Requests made before calibration completes are ignored, not queued.
     * @note The signal remains one after a line-search timeout. Reset to zero
     * before requesting another start; a repeated non-zero value has no effect.
     */
    void setSignal(uint8_t requested_signal);

    /**
     * @brief Runs one time-controlled acquisition, control, and telemetry cycle.
     * @param robot Hardware-facing interface and cached measurement snapshot.
     * @param server Optional WiFi/TCP telemetry transport.
     * @note Each accepted update cycle attempts to refresh sensors, encoders,
     * and the middleware pose. Failed reads retain their previous cached values;
     * local odometry is updated only after a successful encoder read. The method
     * returns early between update intervals.
     */
    void update(Robot_c &robot, RobotWifiAP_c &server);

    /** @brief Opts production firmware into explicit, stopped-at-boot operation. */
    void enableDashboardControl(Robot_c &robot);
    /** @brief Starts an explicit calibration; rejected while another action runs. */
    bool calibrateFromDashboard();
    /** @brief Starts a bounded named test; open_loop uses uncompensated CONSTANT_PWM. */
    bool startFromDashboard(Robot_c &robot, const char* test);
    struct PwmSample {
      unsigned run;
      int pwm;
      unsigned long elapsed_ms;
      int32_t left_delta, right_delta;
      float left_rad_s, right_rad_s;
      bool final;
    };
    /** @brief Consume the last complete two-second encoder window once. */
    bool takePwmSample(PwmSample &sample);
    /** @brief Latches a stop and retries failed I2C stops on subsequent updates. */
    bool stopFromDashboard(Robot_c &robot);
    /** @brief Stable state names used by the WiFi dashboard protocol. */
    const char* dashboardState() const;
    /** @brief Reports whether calibration is complete and no action is running. */
    bool dashboardReady() const;
    /** @brief True while a managed action or an unacknowledged stop is active. */
    bool dashboardBusy() const;

    /** @brief Load this robot's saved flags once at startup. */
    bool loadSettings();
    /** @brief The last confirmed settings, or null when persistent storage is unavailable. */
    const DriftSettings* savedDriftSettings() const { return settings_available ? &drift_settings : nullptr; }
    /** @brief Commit both flags together for subsequent runs. */
    bool saveSettings(const DriftSettings& settings);

  private:
    // Dashboard mode is opt-in so existing controller callers retain their API.
    enum class DashboardAction { IDLE, CALIBRATING, OPEN_LOOP, LINE_FOLLOW, MOTOR_TEST, PWM_SWEEP };
    bool dashboard_control = false;
    bool dashboard_stop_pending = false;
    bool dashboard_fault = false;
    DashboardAction dashboard_action = DashboardAction::IDLE;
    unsigned long dashboard_started_ms = 0;
    unsigned sweep_runs = 0, sweep_run = 0;
    int sweep_pwm = 0;
    bool sweep_settling = false;
    int32_t sweep_left_start = 0, sweep_right_start = 0;
    unsigned long sweep_started_ms = 0;
    PwmSample sweep_sample{};
    bool sample_pending = false;
    bool beginPwmStep(Robot_c &robot);
    void updatePwmSweep(Robot_c &robot, unsigned long encoder_ms);
    /** @brief Advances one managed action after sensor and odometry acquisition. */
    void updateDashboard(Robot_c &robot, unsigned long now, bool fresh_odometry);
    /** @brief Internal modes used by the nominal line-following demonstration. */
    enum Mode {
      WAITING,
      FOLLOWING_LINE,
      SEARCHING_FOR_LINE,
      STOPPED
    };

    uint8_t signal;
    Mode mode;
    TaskTimer_c update_timer;
    TaskTimer_c telemetry_timer;
    /** @brief Keep track of the number of times the function is called */
    unsigned long call_count;
    /** @brief The left motor PWM current setting */
    float left_motor_pwm;
    /** @brief The right motor PWM current setting */
    float right_motor_pwm;
    /** Keep track of the last time a speed measurement was taken */
    unsigned long last_speed_measurement_ms;
    /** Log the last wheel speed encoder count (left wheel) */
    int32_t last_left_wheel_encoder_count;
    /** Log the last wheel speed encoder count (right wheel) */
    int32_t last_right_wheel_encoder_count;
    /** Log the wheel speed (left wheel) */
    float left_wheel_speed;
    /** Log the wheel speed (right wheel) */
    float right_wheel_speed;
    /** @brief Owns the independent forward deadband measurements and ramp state. */
    MotorCalibration_c motor_calibration;
    DriftCorrection_c drift_correction;
    DriftSettings drift_settings{};
    bool settings_available = false;
    /** @brief Whether or not the motor deadband has been calibrated */
    bool motor_deadband_calibrated;
    unsigned long recovery_start_ms;


    /** @brief Returns whether cached DN3 is at or above LINE_THRESHOLD. */
    bool lineDetected(const Robot_c &robot) const;

    /** @brief Measures wheel speed. */
    void monitorWheelSpeed(Robot_c &robot, unsigned long now, float sampling_rate_hz = 10.0);

    /** @brief Runs a start/stop test for the motors. */
    void motorStartStopTest(Robot_c &robot, unsigned long now, bool fresh_odometry);

    /** @brief Computes forward commands shared by the legacy and managed motor tests. */
    void motorTestPWM(unsigned long now, bool fresh_odometry, float &left, float &right);

    /** @brief Runs a speed ramp test for the motors. */
    void motorSpeedRampTest(Robot_c &robot, unsigned long now);

    /** @brief Returns to waiting only after a successful stop, retaining calibration. */
    void finishMotorTest(Robot_c &robot);

    /** @brief Applies the nominal controller behaviour for the current mode. */
    void runLineFollower(Robot_c &robot, unsigned long now);

    /** @brief Wrapper for robot.setMotorPWM */
    void setMotorPWM(Robot_c &robot, float left_pwm, float right_pwm);

    /**
     * @brief Sends the current controller and robot snapshot as one CSV record.
     * @note Controller.cpp writes these 14 columns, in order: timestamp_ms,
     * x, y, theta, left_pwm, right_pwm, left_count, right_count,
     * DN1, DN2, DN3, DN4, DN5, signal. These labels are not sent as a header.
     * x and y are in mm and theta is in radians, from the local Euler estimate,
     * not robot.pose from I2C. PWM values are cached requests, not measured output.
     * The timestamp is the controller-cycle start time; it does not guarantee
     * that every cached reading was successfully refreshed in that cycle.
     */
    void publishTelemetry(Robot_c &robot, RobotWifiAP_c &server, unsigned long timestamp_ms);
};

#endif
