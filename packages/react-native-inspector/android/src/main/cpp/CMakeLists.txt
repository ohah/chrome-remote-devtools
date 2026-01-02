cmake_minimum_required(VERSION 3.13)
project(chromeremotedevtoolsinspector)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Include FetchContent for downloading xhook / xhook 다운로드를 위한 FetchContent 포함
include(FetchContent)

# Download xhook from GitHub / GitHub에서 xhook 다운로드
FetchContent_Declare(
  xhook
  GIT_REPOSITORY https://github.com/iqiyi/xHook.git
  GIT_TAG master
)

# Make xhook available / xhook 사용 가능하게 만들기
FetchContent_MakeAvailable(xhook)

# Build xhook as static library / xhook을 정적 라이브러리로 빌드
# xhook source files / xhook 소스 파일들
set(XHOOK_SOURCES
  ${xhook_SOURCE_DIR}/libxhook/jni/xhook.c
  ${xhook_SOURCE_DIR}/libxhook/jni/xh_core.c
  ${xhook_SOURCE_DIR}/libxhook/jni/xh_elf.c
  ${xhook_SOURCE_DIR}/libxhook/jni/xh_jni.c
  ${xhook_SOURCE_DIR}/libxhook/jni/xh_log.c
  ${xhook_SOURCE_DIR}/libxhook/jni/xh_util.c
  ${xhook_SOURCE_DIR}/libxhook/jni/xh_version.c
)

# Create static library for xhook / xhook용 정적 라이브러리 생성
add_library(xhook_static STATIC ${XHOOK_SOURCES})

# Set C standard for xhook (xhook is written in C) / xhook용 C 표준 설정 (xhook은 C로 작성됨)
set_target_properties(xhook_static PROPERTIES
  C_STANDARD 11
  C_STANDARD_REQUIRED ON
)

# Include xhook headers / xhook 헤더 포함
target_include_directories(
  xhook_static
  PUBLIC
  ${xhook_SOURCE_DIR}/libxhook/jni
)

# Add library / 라이브러리 추가
add_library(
  chromeremotedevtoolsinspector
  SHARED
  ChromeRemoteDevToolsLogHookJNI.cpp
)

# Find required packages / 필요한 패키지 찾기
find_library(log-lib log)
find_library(dl-lib dl)

# Link libraries / 라이브러리 링크
target_link_libraries(
  chromeremotedevtoolsinspector
  ${log-lib}
  ${dl-lib}
  xhook_static
)

# Include xhook headers / xhook 헤더 포함
target_include_directories(
  chromeremotedevtoolsinspector
  PRIVATE
  ${xhook_SOURCE_DIR}/libxhook/jni
)

