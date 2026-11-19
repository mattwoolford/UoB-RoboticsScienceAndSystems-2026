"""Exercise the firmware's settings store with a single-key, commit-aware NVS fake."""
from pathlib import Path
import subprocess
import tempfile

MAIN = Path(__file__).resolve().parents[1] / "main"

with tempfile.TemporaryDirectory(prefix="robot-settings-") as directory:
    work = Path(directory)
    (work / "nvs_flash.h").write_text('#include "nvs.h"\n')
    (work / "nvs.h").write_text(r'''
#pragma once
#include <cassert>
#include <cstdint>
#include <cstring>

using esp_err_t = int;
using nvs_handle_t = int;
enum nvs_open_mode_t { NVS_READONLY, NVS_READWRITE };
constexpr int ESP_OK = 0, ESP_ERR_NVS_NOT_FOUND = 1;
inline int stored = -1, pending = -1;
inline bool failInit, failRead, failWrite, failCommit, open, writable;
inline int nvs_flash_init_partition(const char* partition) {
    assert(std::strcmp(partition, "robot_settings") == 0);
    return failInit ? -1 : ESP_OK;
}
inline int nvs_open_from_partition(const char* partition, const char* ns,
                                   nvs_open_mode_t mode, nvs_handle_t* h) {
    assert(!open && std::strcmp(partition, "robot_settings") == 0 && std::strcmp(ns, "drift") == 0);
    open = true; writable = mode == NVS_READWRITE; *h = 7;
    return ESP_OK;
}
inline int nvs_get_u8(nvs_handle_t h, const char* key, uint8_t* out) {
    assert(open && h == 7 && std::strcmp(key, "flags") == 0);
    if (failRead) return -1;
    if (stored < 0) return ESP_ERR_NVS_NOT_FOUND;
    *out = stored;
    return ESP_OK;
}
inline int nvs_set_u8(nvs_handle_t h, const char* key, uint8_t in) {
    assert(open && writable && h == 7 && std::strcmp(key, "flags") == 0);
    if (failWrite) return -1;
    pending = in;
    return ESP_OK;
}
inline int nvs_commit(nvs_handle_t h) {
    assert(open && writable && h == 7 && pending >= 0);
    if (failCommit) return -1;
    stored = pending;
    return ESP_OK;
}
inline void nvs_close(nvs_handle_t h) {
    assert(open && h == 7);
    open = false; pending = -1;
}
''')
    (work / "test.cpp").write_text(r'''
#include "DriftSettings.h"
#include "nvs.h"
#include <initializer_list>

int main() {
    DriftSettings boot{};
    assert(loadDriftSettings(boot) && boot.correction && !boot.pathRecovery);
    for (bool correction : {false, true}) {
        for (bool recovery : {false, true}) {
            assert(saveDriftSettings({correction, recovery}));
            DriftSettings restart{};
            assert(loadDriftSettings(restart));
            assert(restart.correction == correction && restart.pathRecovery == recovery);
        }
    }

    failWrite = true;
    assert(!saveDriftSettings({false, false}) && !open && stored == 3);
    failWrite = false;
    failCommit = true;
    assert(!saveDriftSettings({false, false}) && !open && stored == 3);
    failCommit = false;
    failRead = true;
    assert(!loadDriftSettings(boot) && !open && boot.correction && !boot.pathRecovery);
    failRead = false;
    failInit = true;
    assert(!loadDriftSettings(boot) && !saveDriftSettings({false, false}));
    failInit = false;
    stored = 4;  // Invalid bits cannot silently replace the current pair.
    assert(!loadDriftSettings(boot) && boot.correction && !boot.pathRecovery);
    stored = -1;  // Project flash restored the namespace-only NVS image.
    boot = {false, true};
    assert(loadDriftSettings(boot) && boot.correction && !boot.pathRecovery);
}
''')
    binary = work / "test"
    subprocess.run(["c++", "-std=c++17", "-DROBOT_DRIFT_CORRECTION=1",
                    "-I", str(work), "-I", str(MAIN), str(MAIN / "DriftSettings.cpp"),
                    str(work / "test.cpp"), "-o", str(binary)], check=True)
    subprocess.run([str(binary)], check=True)
    print("Drift settings storage tests passed")
