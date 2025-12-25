import * as path from 'node:path';
import { defineConfig } from '@rspress/core';
import pluginMermaid from 'rspress-plugin-mermaid';

export default defineConfig({
  root: path.join(__dirname, 'docs'),
  base: process.env.NODE_ENV === 'production' ? '/chrome-remote-devtools/' : '/',
  title: 'Chrome Remote DevTools',
  description:
    'A remote debugging tool that uses Chrome DevTools Protocol (CDP) to control and debug remote Chrome browsers.',
  lang: 'en',
  icon: '/rspress-icon.png',
  logo: {
    light: '/rspress-light-logo.png',
    dark: '/rspress-dark-logo.png',
  },
  locales: [
    {
      lang: 'en',
      label: 'English',
    },
    {
      lang: 'ko',
      label: '한국어',
    },
  ],
  // Type assertion needed because rspress-plugin-mermaid may not export proper types
  // 타입 단언이 필요합니다. rspress-plugin-mermaid가 적절한 타입을 내보내지 않을 수 있기 때문입니다
  plugins: [pluginMermaid() as any],
  builderConfig: {
    output: {
      distPath: {
        root: 'doc_build',
      },
    },
  },
  themeConfig: {
    socialLinks: [
      {
        icon: 'github',
        mode: 'link',
        content: 'https://github.com/ohah/chrome-remote-devtools',
      },
    ],
  },
});
