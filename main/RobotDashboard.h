#ifndef ROBOT_DASHBOARD_H
#define ROBOT_DASHBOARD_H

#include "Controller.h"

/**
 * @brief Bounded, newline-framed dashboard protocol over the existing WiFi TCP AP.
 *
 * The local bridge sends HELLO once, PING at least every 1.5 seconds, and explicit
 * action commands. No socket connection or handshake can start motor movement.
 */
class RobotDashboard_c {
public:
  /** @brief Poll input, enforce the remote lease, and publish 20 Hz telemetry. */
  void update(Robot_c &robot, Controller_c &controller, RobotWifiAP_c &server);
  /** @brief Reserve the physical button while a remote operator owns the session. */
  bool sessionActive() const { return active; }

private:
  // Fixed storage and a per-loop byte budget prevent input from starving control.
  char line[96] = {};
  size_t length = 0;
  bool discarding = false;
  bool active = false;
  uint32_t client_generation = 0;
  unsigned long last_ping_ms = 0;
  unsigned long last_telemetry_ms = 0;
  static constexpr unsigned long LEASE_MS = 1500;
  /** @brief Parse one complete command; only fixed vocabulary is accepted. */
  void command(Robot_c &robot, Controller_c &controller, RobotWifiAP_c &server);
  /** @brief Send a protocol acknowledgement with static, JSON-safe fields. */
  void acknowledge(RobotWifiAP_c &server, const char* command, bool ok, const char* error = "");
  /** @brief Publish cached measurements, explicitly labelled encoder odometry. */
  void telemetry(Robot_c &robot, Controller_c &controller, RobotWifiAP_c &server, unsigned long now);
};

#endif
