#include "DriftSettings.h"

#include <nvs.h>
#include <nvs_flash.h>

namespace {
constexpr char PARTITION[] = "robot_settings";
constexpr char NAMESPACE[] = "drift";
constexpr char KEY[] = "flags";
constexpr uint8_t CORRECTION = 1;
constexpr uint8_t PATH_RECOVERY = 2;

esp_err_t openSettings(nvs_open_mode_t mode, nvs_handle_t& handle) {
    const esp_err_t result = nvs_flash_init_partition(PARTITION);
    if (result != ESP_OK) return result;
    return nvs_open_from_partition(PARTITION, NAMESPACE, mode, &handle);
}
}

bool loadDriftSettings(DriftSettings& settings) {
    nvs_handle_t handle;
    esp_err_t result = openSettings(NVS_READONLY, handle);
    uint8_t flags = 0;
    if (result == ESP_OK) {
        result = nvs_get_u8(handle, KEY, &flags);
        nvs_close(handle);
    }
    if (result == ESP_ERR_NVS_NOT_FOUND) {
        settings = DriftSettings{};
        return true;
    }
    if (result != ESP_OK || flags > (CORRECTION | PATH_RECOVERY)) return false;
    settings.correction = (flags & CORRECTION) != 0;
    settings.pathRecovery = (flags & PATH_RECOVERY) != 0;
    return true;
}

bool saveDriftSettings(const DriftSettings& settings) {
    nvs_handle_t handle;
    if (openSettings(NVS_READWRITE, handle) != ESP_OK) return false;
    const uint8_t flags = (settings.correction ? CORRECTION : 0)
                        | (settings.pathRecovery ? PATH_RECOVERY : 0);
    esp_err_t result = nvs_set_u8(handle, KEY, flags);
    if (result == ESP_OK) result = nvs_commit(handle);
    nvs_close(handle);
    return result == ESP_OK;
}
