# Compile the sketch directly so IDEs give it the firmware's include paths and
# defines. LANGUAGE CXX also makes CMake pass -x c++ for the .ino extension.
idf_component_register(
    SRCS
        "main.ino"
        "Controller.cpp"
        "DriftCorrection.cpp"
        "DriftSettings.cpp"
        "MotorCalibration.cpp"
        "OdometryModel.cpp"
        "Robot.cpp"
        "RobotIMU.cpp"
        "RobotWifiAP.cpp"
        "RobotDashboard.cpp"
        "Sound.cpp"
        "TaskTimer.cpp"
        "${ROBOT_LSM6_DIR}/LSM6.cpp"
        "${ROBOT_LIS3MDL_DIR}/LIS3MDL.cpp"
    INCLUDE_DIRS "." "${ROBOT_LSM6_DIR}" "${ROBOT_LIS3MDL_DIR}"
    REQUIRES arduino-esp32 esp_wifi espressif__network_provisioning
    PRIV_REQUIRES nvs_flash
)
set_source_files_properties("main.ino" PROPERTIES LANGUAGE CXX)

option(ROBOT_DRIFT_CORRECTION "Enable encoder drift correction by default after flashing" OFF)
option(ROBOT_DRIFT_PATH_RECOVERY "Enable path recovery by default after flashing" OFF)
target_compile_definitions(${COMPONENT_LIB} PUBLIC
    ROBOT_DRIFT_CORRECTION=$<BOOL:${ROBOT_DRIFT_CORRECTION}>
    ROBOT_DRIFT_PATH_RECOVERY=$<BOOL:${ROBOT_DRIFT_PATH_RECOVERY}>
)

# A project flash clears only the robot's settings overrides. The default
# NVS partition also holds WiFi data and belongs to the rest of the firmware.
nvs_create_partition_image(robot_settings drift_defaults.csv FLASH_IN_PROJECT)

# The pinned Pololu driver rules out device_auto before its device-type switch.
# Keep that upstream warning visible without failing the firmware build.
set_source_files_properties("${ROBOT_LIS3MDL_DIR}/LIS3MDL.cpp" PROPERTIES
    COMPILE_OPTIONS "-Wno-error=switch"
)
