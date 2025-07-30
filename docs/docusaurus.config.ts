import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Justin Core',
  tagline: 'Helping you run your JITAI study apps',
  favicon: 'img/favicon.ico',

  url: 'https://miacollaborative.github.io',
  baseUrl: '/justin-core/',

  organizationName: 'MIACollaborative',
  projectName: 'justin-core',
  deploymentBranch: 'gh-pages',
  trailingSlash: false,

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  themes: ['@docusaurus/theme-mermaid'],

  presets: [
    [
      'classic',
      {
        docs: {
          path: 'docs',
          routeBasePath: '/',
          sidebarPath: require.resolve('./sidebars.ts'),
          showLastUpdateAuthor: true,
          showLastUpdateTime: true,
        },
        blog: false,
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/justin-logo.png',
    navbar: {
      title: 'Justin',
      logo: {
        alt: 'Justin Logo',
        src: 'img/justin-logo.png',
        href: 'https://miacollaborative.github.io/justin-docs/',
        target: '_self',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          type: 'docsVersionDropdown',
          position: 'right',
        },
      ],
    },
    footer: {
      links: [
        {
          title: 'Community',
          items: [
            {
              label: 'Justin Core - GitHub',
              href: 'https://github.com/MIACollaborative/justin-core',
            },
            {
              label: 'Nord Color Palette',
              href: 'https://www.nordtheme.com',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Justin Project.`,
    },
  } satisfies Preset.ThemeConfig,

  future: {
    v4: true,
  },
};

export default config;
