cmake_minimum_required(VERSION 3.13)
project(chromeremotedevtoolsinspector)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Find all C++ files / 모든 C++ 파일 찾기
file(GLOB_RECURSE android_files RELATIVE ${CMAKE_SOURCE_DIR}
     "src/main/cpp/**.cpp"
)

# Find common C++ files / 공통 C++ 파일 찾기
file(GLOB_RECURSE common_files RELATIVE ${CMAKE_SOURCE_DIR}
     "../cpp/**.cpp"
)

# Add library / 라이브러리 추가
add_library(
  chromeremotedevtoolsinspector
  SHARED
  ${android_files}
  ${common_files}
)

# Set up local includes / 로컬 include 설정
# Get absolute path to common C++ directory / 공통 C++ 디렉토리의 절대 경로 가져오기
# CMAKE_CURRENT_SOURCE_DIR is packages/react-native-inspector/android
# So ../cpp points to packages/react-native-inspector/cpp
get_filename_component(COMMON_CPP_DIR "${CMAKE_CURRENT_SOURCE_DIR}/../cpp" ABSOLUTE)
include_directories(
  "src/main/cpp"
  "${COMMON_CPP_DIR}"
)

# Find required packages / 필요한 패키지 찾기
find_library(log-lib log)
find_library(dl-lib dl)

# Find React Native and fbjni using Prefab / Prefab를 사용하여 React Native와 fbjni 찾기
# Based on react-native-mmkv's approach / react-native-mmkv의 접근 방식 기반
find_package(fbjni REQUIRED CONFIG)
find_package(ReactAndroid REQUIRED CONFIG)

# Link libraries using Prefab targets / Prefab 타겟을 사용하여 라이브러리 링크
target_link_libraries(
  chromeremotedevtoolsinspector
  ${log-lib}
  ${dl-lib}
  fbjni::fbjni                    # Facebook C++ JNI helpers / Facebook C++ JNI 헬퍼
  ReactAndroid::jsi                # JSI API / JSI API
)

# Link react-native (different prefab between RN 0.75 and RN 0.76) /
# react-native 링크 (RN 0.75와 RN 0.76 사이의 다른 prefab)
# Note: ReactAndroid::reactnative already includes folly / 참고: ReactAndroid::reactnative는 이미 folly를 포함합니다
if(ReactAndroid_VERSION_MINOR GREATER_EQUAL 76)
  target_link_libraries(
    chromeremotedevtoolsinspector
    ReactAndroid::reactnative     # RN: Native Modules umbrella prefab / RN: Native Modules 통합 prefab
  )
else()
  target_link_libraries(
    chromeremotedevtoolsinspector
    ReactAndroid::react_nativemodule_core  # RN: TurboModules Core / RN: TurboModules 코어
  )
endif()
