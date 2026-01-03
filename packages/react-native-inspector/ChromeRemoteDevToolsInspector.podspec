#
# Be sure to run `pod lib lint ChromeRemoteDevToolsInspector.podspec' to ensure this is a
# valid spec before submitting.
#
# Any lines starting with a # are optional, but their use is encouraged
# To learn more about a Podspec see https://guides.cocoapods.org/syntax/podspec.html
#

Pod::Spec.new do |s|
  s.name             = 'ChromeRemoteDevToolsInspector'
  s.version          = '0.1.0'
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

  # Include Legacy Module files / Legacy Module 파일 포함
  s.source_files = 'ios/**/*.{h,mm}'
  s.public_header_files = 'ios/**/*.h'

  # Enable module / 모듈 활성화
  s.module_name = 'ChromeRemoteDevToolsInspector'

  # Configure module settings / 모듈 설정
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'CLANG_ENABLE_MODULES' => 'YES',
  }

  s.dependency 'React-Core'
  s.dependency 'React-jsinspector'
  s.dependency 'SocketRocket'

  s.compiler_flags = '-DRCT_DEV=1 -DRCT_REMOTE_PROFILE=1'
end

