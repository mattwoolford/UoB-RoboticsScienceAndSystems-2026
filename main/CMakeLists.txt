# Compile the sketch directly so IDEs give it the firmware's include paths and
# defines. LANGUAGE CXX also makes CMake pass -x c++ for the .ino extension.
idf_component_register(
    SRCS
        "main.ino"
        "Controller.cpp"
        "MotorCalibration.cpp"
        "OdometryModel.cpp"
        "Robot.cpp"
        "RobotIMU.cpp"
        "RobotWifiAP.cpp"
        "Sound.cpp"
        "TaskTimer.cpp"
        "${ROBOT_LSM6_DIR}/LSM6.cpp"
        "${ROBOT_LIS3MDL_DIR}/LIS3MDL.cpp"
    INCLUDE_DIRS "." "${ROBOT_LSM6_DIR}" "${ROBOT_LIS3MDL_DIR}"
    REQUIRES arduino-esp32 esp_wifi espressif__network_provisioning
)
set_source_files_properties("main.ino" PROPERTIES LANGUAGE CXX)

# The pinned Pololu driver rules out device_auto before its device-type switch.
# Keep that upstream warning visible without failing the firmware build.
set_source_files_properties("${ROBOT_LIS3MDL_DIR}/LIS3MDL.cpp" PROPERTIES
    COMPILE_OPTIONS "-Wno-error=switch"
)
