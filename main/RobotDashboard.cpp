#include "RobotDashboard.h"
#include <cstdio>
#include <cstring>

// HELLO and the save acknowledgement report the same persisted flag pair.
static void sendWithSettings(RobotWifiAP_c &server, const char* fields, const DriftSettings& settings) {
  char message[192];
  const int size = snprintf(message, sizeof(message),
      "{%s,\"settings\":{\"drift_correction\":%s,\"drift_path_recovery\":%s}}\n",
      fields, settings.correction ? "true" : "false", settings.pathRecovery ? "true" : "false");
  if (size > 0 && size < int(sizeof(message)))
    server.sendBuffer(reinterpret_cast<const uint8_t*>(message), size);
}

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
    const auto* settings = controller.savedDriftSettings();
    if (settings) {
      sendWithSettings(server, "\"type\":\"hello\",\"protocol\":1,\"robot\":\"stamp-c3\",\"pwm_sweep\":true", *settings);
    } else {
      server.sendLine("{\"type\":\"hello\",\"protocol\":1,\"robot\":\"stamp-c3\",\"pwm_sweep\":true}");
    }
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
  if (strcmp(line, "SETTINGS") == 0 || strncmp(line, "SETTINGS ", 9) == 0) {
    const char* flags = line + 8;
    if (strlen(flags) != 4 || flags[2] != ' ' ||
        (flags[1] != '0' && flags[1] != '1') || (flags[3] != '0' && flags[3] != '1')) {
      acknowledge(server, "SETTINGS", false, "invalid_settings");
    } else if (!controller.saveSettings({flags[1] == '1', flags[3] == '1'})) {
      acknowledge(server, "SETTINGS", false, "settings_write_failed");
    } else {
      sendWithSettings(server, "\"type\":\"ack\",\"command\":\"SETTINGS\",\"ok\":true,\"error\":\"\"",
                       *controller.savedDriftSettings());
    }
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
  Controller_c::PwmSample sample;
  if (active && controller.takePwmSample(sample)) {
    char message[256];
    const int size = snprintf(message, sizeof(message),
        "{\"type\":\"pwm_sample\",\"run\":%u,\"pwm\":%d,\"elapsed_ms\":%lu,"
        "\"left_delta\":%ld,\"right_delta\":%ld,\"left_rad_s\":%.7f,\"right_rad_s\":%.7f}\n",
        sample.run, sample.pwm, sample.elapsed_ms, long(sample.left_delta), long(sample.right_delta),
        sample.left_rad_s, sample.right_rad_s);
    if (size <= 0 || size >= int(sizeof(message)) ||
        !server.sendBuffer(reinterpret_cast<const uint8_t*>(message), size)) {
      controller.stopFromDashboard(robot);
      server.disconnectClient();
      return;
    }
    if (sample.final) server.sendLine("{\"type\":\"pwm_sweep_done\"}");
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
