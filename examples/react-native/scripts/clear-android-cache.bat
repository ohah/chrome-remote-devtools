@echo off
REM Clear Android/Gradle/CMake caches for clean rebuild / 클린 빌드를 위한 Android·Gradle·CMake 캐시 삭제
set ROOT=%~dp0..
if exist "%ROOT%\android\.gradle" rmdir /s /q "%ROOT%\android\.gradle"
if exist "%ROOT%\android\app\build" rmdir /s /q "%ROOT%\android\app\build"
if exist "%ROOT%\android\build" rmdir /s /q "%ROOT%\android\build"
set LIB=%ROOT%\node_modules\@ohah\chrome-remote-devtools-inspector-react-native\android\.cxx
if exist "%LIB%" rmdir /s /q "%LIB%"
echo Android cache cleared.
