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
            '../../packages/react-native-inspector/ChromeRemoteDevToolsInspector.podspec'
          ),
        },
        android: {
          sourceDir: path.resolve(__dirname, '../../packages/react-native-inspector/android'),
          packageImportPath:
            'import com.ohah.chromeremotedevtools.ChromeRemoteDevToolsInspectorPackage;',
        },
      },
    },
  },
  assets: ['./node_modules/react-native-vector-icons/fonts'],
};

module.exports = withWorkspaceModule(config, modulePackagePath);
