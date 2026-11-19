#include "RobotDashboard.h"
#include <cstdio>
#include <cstring>

void RobotDashboard_c::acknowledge(RobotWifiAP_c &server, const char* name, bool ok, const char* error) {
  // All strings passed here are fixed protocol vocabulary, never untrusted input.
  char message[192];
  const int size = snprintf(message, sizeof(message),
      "{\"type\":\"ack\",\"command\":\"%s\",\"ok\":%s,\"error\":\"%s\"}\n",
      name, ok ? "true" : "false", error);
  if (size > 0 && size < int(sizeof(message)))
    server.sendBuffer(reinterpret_cast<const uint8_t*>(message), size);
}

void RobotDashboard_c::command(Robot_c &robot, Controller_c &controller, RobotWifiAP_c &server) {
  if (strcmp(line, "HELLO") == 0) {
    // Takeover first stops any local action. An I2C failure remains visible as
    // 'stopping', prevents starts, and is retried by the control update.
    controller.stopFromDashboard(robot);
    active = true;
    last_ping_ms = robot.getMillis();
    server.sendLine("{\"type\":\"hello\",\"protocol\":1,\"robot\":\"stamp-c3\"}");
    return;
  }
  if (strcmp(line, "STOP") == 0) {
    const bool stopped = controller.stopFromDashboard(robot);
    acknowledge(server, "STOP", stopped, stopped ? "" : "stop_pending");
    return;
  }
  if (!active) {
    acknowledge(server, "UNKNOWN", false, "hello_required");
    return;
  }
  if (strcmp(line, "PING") == 0) {
    last_ping_ms = robot.getMillis();
    // PING is deliberately silent so command acknowledgements stay unambiguous.
    return;
  }
  if (strcmp(line, "CALIBRATE") == 0) {
    const bool accepted = controller.calibrateFromDashboard();
    acknowledge(server, "CALIBRATE", accepted, accepted ? "" : "busy_or_stopping");
    return;
  }
  if (strncmp(line, "START ", 6) == 0) {
    const bool accepted = controller.startFromDashboard(robot, line + 6);
    acknowledge(server, "START", accepted, accepted ? "" : "not_ready_busy_fault_or_unknown_test");
    return;
  }
  acknowledge(server, "UNKNOWN", false, "unknown_command");
}

void RobotDashboard_c::telemetry(Robot_c &robot, Controller_c &controller,
                                RobotWifiAP_c &server, unsigned long now) {
  // This is a measured encoder estimate, not physical ground-truth centrepoint
  // drift. PWM fields are acknowledged requests; sensor values are cached reads.
  char message[512];
  const int size = snprintf(message, sizeof(message),
      "{\"type\":\"telemetry\",\"timestamp_ms\":%lu,\"x_mm\":%.2f,\"y_mm\":%.2f,"
      "\"heading_rad\":%.5f,\"left_pwm\":%d,\"right_pwm\":%d,"
      "\"left_count\":%ld,\"right_count\":%ld,\"sensors\":[%u,%u,%u,%u,%u],"
      "\"state\":\"%s\",\"ready\":%s,\"pose_source\":\"odometry\"}\n",
      now, controller.odometry.pose.x, controller.odometry.pose.y, controller.odometry.pose.theta,
      robot.getLeftMotorPWM(), robot.getRightMotorPWM(),
      long(robot.getLeftEncoderCount()), long(robot.getRightEncoderCount()),
      robot.surface.reading[0], robot.surface.reading[1], robot.surface.reading[2],
      robot.surface.reading[3], robot.surface.reading[4], controller.dashboardState(),
      controller.dashboardReady() ? "true" : "false");
  if (size > 0 && size < int(sizeof(message)))
    server.sendBuffer(reinterpret_cast<const uint8_t*>(message), size);
}

void RobotDashboard_c::update(Robot_c &robot, Controller_c &controller, RobotWifiAP_c &server) {
  const unsigned long now = robot.getMillis();
  // A replacement socket can be accepted in the same loop as a disconnect.
  // Never transfer a previous client's heartbeat lease or partial command.
  if (server.clientGeneration() != client_generation) {
    if (active) controller.stopFromDashboard(robot);
    active = false;
    length = 0;
    discarding = false;
    client_generation = server.clientGeneration();
  }
  // Unsigned subtraction makes the lease correct across millis() rollover.
  if (active && (!server.clientConnected() || now - last_ping_ms >= LEASE_MS)) {
    controller.stopFromDashboard(robot);
    active = false;
    length = 0;
    discarding = false;
    server.disconnectClient();
  }
  if (!server.clientConnected()) {
    // Never combine a partial line from one TCP client with another's commands.
    length = 0;
    discarding = false;
    return;
  }
  for (size_t consumed = 0; consumed < 128 && server.available(); ++consumed) {
    const int value = server.read();
    if (value < 0) break;
    if (value == '\n') {
      if (discarding) acknowledge(server, "UNKNOWN", false, "line_too_long_or_invalid");
      else {
        line[length] = '\0';
        if (length) command(robot, controller, server);
      }
      length = 0;
      discarding = false;
    } else if (value != '\r') {
      // Reject control bytes and overflowing frames as a whole, without ever
      // interpreting the trailing fragment as a new command.
      if (value < 32 || value > 126 || length >= sizeof(line) - 1) discarding = true;
      if (!discarding) line[length++] = char(value);
    }
  }
  if (active && now - last_telemetry_ms >= Controller_c::TELEMETRY_INTERVAL_MS) {
    last_telemetry_ms = now;
    telemetry(robot, controller, server, now);
  }
}
