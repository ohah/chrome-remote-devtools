#
# Be sure to run `pod lib lint ChromeRemoteDevToolsInspector.podspec' to ensure this is a
# valid spec before submitting.
#
# Any lines starting with a # are optional, but their use is encouraged
# To learn more about a Podspec see https://guides.cocoapods.org/syntax/podspec.html
#

Pod::Spec.new do |s|
  s.name             = 'ChromeRemoteDevToolsInspector'
  s.version          = '0.1.0-rc.1'
  s.summary          = 'Chrome Remote DevTools Inspector Plugin for React Native / React Native용 Chrome Remote DevTools Inspector 플러그인'
  s.description      = <<-DESC
  Custom Inspector plugin that connects React Native Inspector to Chrome Remote DevTools server.
  This plugin allows you to use Chrome Remote DevTools with React Native apps without modifying bundleURL.
  React Native Inspector를 Chrome Remote DevTools 서버에 연결하는 커스텀 Inspector 플러그인.
  이 플러그인을 사용하면 bundleURL을 수정하지 않고도 React Native 앱에서 Chrome Remote DevTools를 사용할 수 있습니다.
                       DESC

  s.homepage         = 'https://github.com/ohah/chrome-remote-devtools'
  s.license          = { :type => 'MIT', :file => 'LICENSE' }
  s.author           = { 'ohah' => 'bookyoon173@gmail.com' }
  s.source           = { :git => 'https://github.com/ohah/chrome-remote-devtools.git', :tag => s.version.to_s }

  s.ios.deployment_target = '15.1'
  s.requires_arc = true

  # npm 패키지 구조에 맞게 경로 수정 / 경로 수정 for npm package structure
  # Include TurboModule files (Objective-C++ only, no Swift) / TurboModule 파일 포함 (Objective-C++만, Swift 없음)
  # Also include common C++ files / 공통 C++ 파일도 포함
  s.source_files = [
    'ios/ChromeRemoteDevToolsInspector/**/*.{h,mm}',
    'cpp/**/*.{h,cpp}'  # Common C++ code / 공통 C++ 코드
  ]
  s.public_header_files = 'ios/ChromeRemoteDevToolsInspector/**/*.h'

  # Enable module / 모듈 활성화
  s.module_name = 'ChromeRemoteDevToolsInspector'

  # Configure module settings / 모듈 설정
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'CLANG_ENABLE_MODULES' => 'YES',
    'CLANG_CXX_LANGUAGE_STANDARD' => 'c++17',
    'HEADER_SEARCH_PATHS' => [
      '"$(PODS_TARGET_SRCROOT)/cpp"',  # Common C++ code / 공통 C++ 코드
    ]
  }

  # Use install_modules_dependencies to automatically add React Native dependencies / install_modules_dependencies를 사용하여 React Native 의존성 자동 추가
  # This function automatically adds React-Core, React-jsi, and header search paths / 이 함수는 React-Core, React-jsi 및 헤더 검색 경로를 자동으로 추가합니다
  # Reference: mmkv and NativeCxxModuleExample use this approach / 참고: mmkv와 NativeCxxModuleExample이 이 방식을 사용합니다
  install_modules_dependencies(s)

  # Additional dependencies / 추가 의존성
  s.dependency 'React-jsinspector'
  s.dependency 'ReactCommon/turbomodule/core'  # TurboModule headers (RCTTurboModule, RCTTurboModuleWithJSIBindings, etc.) / TurboModule 헤더 (RCTTurboModule, RCTTurboModuleWithJSIBindings 등)
  s.dependency 'SocketRocket'

  s.compiler_flags = '-DRCT_DEV=1 -DRCT_REMOTE_PROFILE=1'
end

