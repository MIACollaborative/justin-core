import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Justin Docs',
  tagline: 'Just-in-time interventions, documented.',
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
          sidebarPath: require.resolve('./sidebars.ts'),
          editUrl: 'https://github.com/your-org/justin-docs/edit/main/',
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
          type: 'docsVersionDropdown',
          position: 'right',
          dropdownActiveClassDisabled: true
        },
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          href: 'https://github.com/MIACollaborative/justin-core',
          label: 'JustIn-core - GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
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
            // {
            //   label: 'JustIn-Core - Discussions',
            //   href: 'https://github.com/MIACollaborative/justin-core/discussions',
            // },
            {
              label: 'JustIn-Core - GitHub',
              href: 'https://github.com/MIACollaborative/justin-core',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Justin Project.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,

  future: {
    v4: true,
  },
};

export default config;
