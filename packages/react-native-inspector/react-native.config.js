/**
 * React Native Autolinking configuration / React Native Autolinking 설정
 * This file configures how React Native CLI links this package / React Native CLI가 이 패키지를 링크하는 방법을 설정합니다
 */
module.exports = {
  ios: {
    podspecPath: './ios/ChromeRemoteDevToolsInspector.podspec',
  },
  android: {
    sourceDir: './android',
    packageImportPath: 'import com.ohah.chromeremotedevtools.ChromeRemoteDevToolsInspectorPackage;',
  },
};

