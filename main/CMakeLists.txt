idf_component_register(
    SRCS
        "arduino_sketch.cpp"
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
# Expose the sketch to IDEs; arduino_sketch.cpp compiles it via #include.
set_source_files_properties("main.ino" PROPERTIES HEADER_FILE_ONLY TRUE)
target_sources(${COMPONENT_LIB} PRIVATE "main.ino")

# The pinned Pololu driver rules out device_auto before its device-type switch.
# Keep that upstream warning visible without failing the firmware build.
set_source_files_properties("${ROBOT_LIS3MDL_DIR}/LIS3MDL.cpp" PROPERTIES
    COMPILE_OPTIONS "-Wno-error=switch"
)
