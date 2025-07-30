import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Justin-Core',
  tagline: 'Helping you run your JITAI study apps',
  favicon: 'img/favicon.ico',

  url: 'https://your-docs-site.example.com', // 🔧 Update when deployed
  baseUrl: '/',

  organizationName: 'your-org', // 🔧 Replace with your GitHub org/user
  projectName: 'justin-docs',   // 🔧 Replace with your GitHub repo

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  themes: [
    '@docusaurus/theme-mermaid',
  ],

  presets: [
    [
      'classic',
      {
        docs: {
          routeBasePath: '/docs',
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
          title: 'Docs',
          items: [
            {
              label: 'Overview',
              to: '/docs/intro',
            },
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'JustIn-Core - GitHub',
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
