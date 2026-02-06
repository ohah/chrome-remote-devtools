const path = require('path');
const fs = require('fs');

// Resolve symlinks for bun monorepo packages
const resolvePackage = (packageName) => {
  const symlinkedPath = path.resolve(__dirname, 'node_modules', packageName);
  try {
    return fs.realpathSync(symlinkedPath);
  } catch {
    return symlinkedPath;
  }
};

// Register this package as a workspace module for autolinking
const packageName = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8')).name;

module.exports = {
  dependencies: {
    [packageName]: { root: __dirname },
    'react-native-nitro-modules': {
      root: resolvePackage('react-native-nitro-modules'),
    },
    'react-native-mmkv': {
      root: resolvePackage('react-native-mmkv'),
    },
  },
};
