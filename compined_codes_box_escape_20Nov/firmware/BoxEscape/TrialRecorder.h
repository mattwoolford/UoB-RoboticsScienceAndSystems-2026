#pragma once
#include <stdint.h>
#include <esp_http_server.h>
class Robot_c;
class TopIR_c;
class Controller_c;

struct TrialInfo {
  uint32_t id;         // Zero before the first attempt of this boot.
  const char* state;   // empty, active, finished or rejected.
  uint32_t samples;    // Rows retained and available for export.
};
TrialInfo trialInfo();
// Reserve on the controller loop before commanding motion. A lost number is
// preferable to assigning an earlier number to another experiment.
bool reserveEscapeId(uint32_t& nextId);
struct TrialCalibration {
  bool calibrated;
  int leftThreshold;
  int rightThreshold;
};
TrialCalibration escapeCalibration(const Controller_c&);
void beginEscapeRecord(const Controller_c&, Robot_c&, const TopIR_c&, uint32_t id, TrialCalibration);
inline void beginEscapeRecord(const Controller_c& c, Robot_c& r, const TopIR_c& ir, uint32_t id) {
  beginEscapeRecord(c,r,ir,id,escapeCalibration(c));
}
void observeEscapeRecord(const Controller_c&, Robot_c&, const TopIR_c&, bool tcpLost=false);
esp_err_t serveTrialCsv(httpd_req_t* req);
