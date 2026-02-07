const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const {
  withChromeRemoteDevToolsRedux,
} = require('@ohah/chrome-remote-devtools-inspector-react-native/metro');

// Monorepo workspace root (two levels up from examples/react-native)
const workspaceRoot = path.resolve(__dirname, '../..');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = getDefaultConfig(__dirname);

const mergedConfig = mergeConfig(getDefaultConfig(__dirname), {
  ...config,
  // Watch the entire monorepo so Metro can resolve workspace packages and hoisted deps
  watchFolders: [workspaceRoot],
  resolver: {
    ...config.resolver,
    // Allow Metro to resolve modules from both local and root node_modules
    nodeModulesPaths: [
      path.resolve(__dirname, 'node_modules'),
      path.resolve(workspaceRoot, 'node_modules'),
    ],
    // Force react/react-native to always resolve from the app root so workspace
    // packages don't accidentally load a second React instance (dual-React bug)
    resolveRequest: (context, moduleName, platform) => {
      if (
        moduleName === 'react' ||
        moduleName.startsWith('react/') ||
        moduleName === 'react-native' ||
        moduleName.startsWith('react-native/')
      ) {
        return context.resolveRequest(
          { ...context, originModulePath: path.resolve(__dirname, 'index.js') },
          moduleName,
          platform
        );
      }
      return context.resolveRequest(context, moduleName, platform);
    },
  },
});

module.exports = withChromeRemoteDevToolsRedux(mergedConfig);
