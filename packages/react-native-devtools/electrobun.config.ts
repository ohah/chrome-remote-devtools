import type { ElectrobunConfig } from 'electrobun';

export default {
  app: {
    name: 'react-native-devtools',
    identifier: 'dev.electrobun.react-native-devtools',
    version: '0.0.1',
  },
  build: {
    // Vite builds to dist/, we copy from there
    copy: {
      'dist/index.html': 'views/mainview/index.html',
      'dist/assets': 'views/mainview/assets',
    },
    mac: {
      bundleCEF: true,
      defaultRenderer: 'cef',
      // Code signing: codesign needs ELECTROBUN_DEVELOPER_ID only.
      // codesign: true,   // env: ELECTROBUN_DEVELOPER_ID
      // notarize: true,   // env: ELECTROBUN_APPLEID, ELECTROBUN_APPLEIDPASS, ELECTROBUN_TEAMID (only when notarize)
    },
    linux: {
      bundleCEF: true,
      defaultRenderer: 'cef',
    },
    win: {
      bundleCEF: false,
    },
  },
} satisfies ElectrobunConfig;
