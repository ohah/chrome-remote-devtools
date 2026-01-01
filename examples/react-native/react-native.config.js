const { withWorkspaceModule } = require('@craby/devkit');
const path = require('path');

const modulePackagePath = __dirname;
const config = {
  dependencies: {
    '@ohah/chrome-remote-devtools-react-native': {
      platforms: {
        ios: {
          podspecPath: path.resolve(
            __dirname,
            '../../packages/react-native-inspector/ios/ChromeRemoteDevToolsInspector.podspec'
          ),
        },
        android: {
          sourceDir: path.resolve(__dirname, '../../packages/react-native-inspector/android'),
          packageImportPath: 'import com.ohah.chromeremotedevtools.ChromeRemoteDevToolsInspectorPackage;',
        },
      },
    },
  },
};

module.exports = withWorkspaceModule(config, modulePackagePath);
