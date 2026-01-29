cmake_minimum_required(VERSION 3.13)
project(chromeremotedevtoolsinspector)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# =============================================================================
# Android: C++ console/network hooks are EXCLUDED from build / Android: C++ 콘솔·네트워크 훅은 빌드에서 제외됨
# =============================================================================
# Console/network hooks are implemented in JavaScript only (src/console/, src/network/).
# C++ JSI console/network code (cpp/ConsoleHook.*, cpp/NetworkHook.*, cpp/console/, cpp/network/)
# is deprecated and not compiled here; only android/src/main/cpp/ (JNI stub) is built.
# 콘솔·네트워크 훅은 JavaScript 전용(src/console/, src/network/)으로 구현됨.
# C++ JSI 콘솔·네트워크(cpp/ConsoleHook.*, cpp/NetworkHook.*, cpp/console/, cpp/network/)는
# 디프리케이트되어 여기서는 컴파일하지 않음. android/src/main/cpp/(JNI 스텁)만 빌드함.
# =============================================================================

file(GLOB_RECURSE android_files RELATIVE ${CMAKE_SOURCE_DIR}
     "src/main/cpp/**.cpp"
)

add_library(
  chromeremotedevtoolsinspector
  SHARED
  ${android_files}
)

include_directories(
  "src/main/cpp"
)

# Still required: JNI stub uses fbjni, JSI, RuntimeExecutor (nativeHandleCDPMessage, nativeHookJSILog) /
# 여전히 필요: JNI 스텁이 fbjni·JSI·RuntimeExecutor 사용 (nativeHandleCDPMessage, nativeHookJSILog)
find_library(log-lib log)
find_library(dl-lib dl)
find_package(fbjni REQUIRED CONFIG)
find_package(ReactAndroid REQUIRED CONFIG)

target_link_libraries(
  chromeremotedevtoolsinspector
  ${log-lib}
  ${dl-lib}
  fbjni::fbjni
  ReactAndroid::jsi
)

if(ReactAndroid_VERSION_MINOR GREATER_EQUAL 76)
  target_link_libraries(chromeremotedevtoolsinspector ReactAndroid::reactnative)
else()
  target_link_libraries(chromeremotedevtoolsinspector ReactAndroid::react_nativemodule_core)
endif()
