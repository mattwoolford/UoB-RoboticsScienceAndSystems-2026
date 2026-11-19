cmake_minimum_required(VERSION 3.24)

# Prefer an exported IDF_PATH; fall back to this machine's installation.
if(NOT DEFINED ENV{IDF_PATH})
    set(ENV{IDF_PATH} "$ENV{HOME}/.espressif/v6.1/esp-idf")
endif()
if(NOT EXISTS "$ENV{IDF_PATH}/tools/cmake/project.cmake")
    message(FATAL_ERROR "Export your ESP-IDF installation's export.sh before configuring.")
endif()

set(IDF_TARGET esp32c3 CACHE STRING "ESP-IDF target")
if(NOT IDF_TARGET STREQUAL "esp32c3")
    message(FATAL_ERROR "The Stamp C3 firmware requires IDF_TARGET=esp32c3.")
endif()

# Pololu's Arduino libraries have no CMake build; main registers their sources.
include(FetchContent)
set(FETCHCONTENT_QUIET OFF)
# Download only the pinned source snapshot, rather than fetching Git history.
# SOURCE_SUBDIR prevents FetchContent from configuring this IDF component as a
# standalone CMake project; ESP-IDF registers it via EXTRA_COMPONENT_DIRS below.
FetchContent_Declare(arduino_core
    URL https://codeload.github.com/espressif/arduino-esp32/tar.gz/aeabde6e33e4dfe44842166975032b68f6e479a7
    URL_HASH SHA256=4c19cecdffae9439aaf17cb36150f8336657e814a77135d13a05ef4e4b7eec08
    DOWNLOAD_EXTRACT_TIMESTAMP TRUE
    SOURCE_DIR "${CMAKE_BINARY_DIR}/_deps/arduino-esp32"
    SOURCE_SUBDIR _idf_component_only
)
FetchContent_Declare(lsm6
    GIT_REPOSITORY https://github.com/pololu/lsm6-arduino.git
    GIT_TAG 221a06ae0eca0837305c1abcace8947fe132c600
    GIT_PROGRESS TRUE
)
FetchContent_Declare(lis3mdl
    GIT_REPOSITORY https://github.com/pololu/lis3mdl-arduino.git
    GIT_TAG cc51375da518d2b59d2c45e93bde915f842b92ea
    GIT_PROGRESS TRUE
)
FetchContent_MakeAvailable(arduino_core lsm6 lis3mdl)
list(APPEND EXTRA_COMPONENT_DIRS "${arduino_core_SOURCE_DIR}")
# Make the downloaded library paths available to the main component.
set(ROBOT_LSM6_DIR "${lsm6_SOURCE_DIR}")
set(ROBOT_LIS3MDL_DIR "${lis3mdl_SOURCE_DIR}")

include($ENV{IDF_PATH}/tools/cmake/project.cmake)
project(RoboticsScienceAndSystems)

# app-flash is created by project(). Restore the same build defaults on either
# ESP-IDF flash route, including when reinstalling an identical application.
partition_table_get_partition_info(settings_offset "--partition-name robot_settings" "offset")
if(settings_offset)
    esptool_py_flash_target_image(app-flash robot_settings "${settings_offset}"
        "${CMAKE_BINARY_DIR}/robot_settings.bin" ALWAYS_PLAINTEXT)
else()
    message(WARNING "Select partitions.csv under Partition Table -> Custom partition table CSV in idf.py menuconfig to enable robot settings.")
    # The image generator supplies a failing target when the partition is absent.
    add_dependencies(flash nvs_robot_settings_bin)
endif()
add_dependencies(app-flash nvs_robot_settings_bin)

# IDF 6.1's ESP32-C3 SPI headers use partial aggregate initializers. GCC 15
# warns when Arduino includes them from C++; retain the warning without
# promoting it to an error in this third-party component.
idf_component_get_property(arduino_target arduino-esp32 COMPONENT_LIB)
target_compile_options(${arduino_target} PRIVATE
    $<$<COMPILE_LANGUAGE:CXX>:-Wno-error=missing-field-initializers>
)
