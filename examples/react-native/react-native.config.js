const { withWorkspaceModule } = require('@craby/devkit');
const path = require('path');
const fs = require('fs');

const modulePackagePath = __dirname;

// Resolve symlinks for bun monorepo packages
const resolvePackage = (packageName) => {
  const symlinkedPath = path.resolve(__dirname, 'node_modules', packageName);
  try {
    return fs.realpathSync(symlinkedPath);
  } catch {
    return symlinkedPath;
  }
};

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
    'react-native-nitro-modules': {
      root: resolvePackage('react-native-nitro-modules'),
    },
    'react-native-mmkv': {
      root: resolvePackage('react-native-mmkv'),
    },
  },
};

module.exports = withWorkspaceModule(config, modulePackagePath);
