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
