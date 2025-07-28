import React from 'react';
import ComponentCreator from '@docusaurus/ComponentCreator';

export default [
  {
    path: '/__docusaurus/debug',
    component: ComponentCreator('/__docusaurus/debug', '5ff'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/config',
    component: ComponentCreator('/__docusaurus/debug/config', '5ba'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/content',
    component: ComponentCreator('/__docusaurus/debug/content', 'a2b'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/globalData',
    component: ComponentCreator('/__docusaurus/debug/globalData', 'c3c'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/metadata',
    component: ComponentCreator('/__docusaurus/debug/metadata', '156'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/registry',
    component: ComponentCreator('/__docusaurus/debug/registry', '88c'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/routes',
    component: ComponentCreator('/__docusaurus/debug/routes', '000'),
    exact: true
  },
  {
    path: '/markdown-page',
    component: ComponentCreator('/markdown-page', '3d7'),
    exact: true
  },
  {
    path: '/docs',
    component: ComponentCreator('/docs', 'df3'),
    routes: [
      {
        path: '/docs/next',
        component: ComponentCreator('/docs/next', '8cd'),
        routes: [
          {
            path: '/docs/next',
            component: ComponentCreator('/docs/next', '41a'),
            routes: [
              {
                path: '/docs/next/concepts/events',
                component: ComponentCreator('/docs/next/concepts/events', 'eb2'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/next/concepts/handlers',
                component: ComponentCreator('/docs/next/concepts/handlers', '525'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/next/concepts/overview',
                component: ComponentCreator('/docs/next/concepts/overview', 'e3c'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/next/concepts/users',
                component: ComponentCreator('/docs/next/concepts/users', '49c'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/next/intro',
                component: ComponentCreator('/docs/next/intro', 'ad0'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/next/reference/types',
                component: ComponentCreator('/docs/next/reference/types', 'b72'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/next/roadmap',
                component: ComponentCreator('/docs/next/roadmap', '260'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/next/typeDoc/',
                component: ComponentCreator('/docs/next/typeDoc/', '66e'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/next/typeDoc/functions/default',
                component: ComponentCreator('/docs/next/typeDoc/functions/default', 'cb4'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/next/typeDoc/variables/Log',
                component: ComponentCreator('/docs/next/typeDoc/variables/Log', 'c17'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/next/using',
                component: ComponentCreator('/docs/next/using', 'bda'),
                exact: true,
                sidebar: "tutorialSidebar"
              }
            ]
          }
        ]
      },
      {
        path: '/docs',
        component: ComponentCreator('/docs', 'a2a'),
        routes: [
          {
            path: '/docs',
            component: ComponentCreator('/docs', '7c5'),
            routes: [
              {
                path: '/docs/concepts',
                component: ComponentCreator('/docs/concepts', '50f'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/handlers',
                component: ComponentCreator('/docs/handlers', '4ed'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/intro',
                component: ComponentCreator('/docs/intro', 'c78'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/typeDoc/',
                component: ComponentCreator('/docs/typeDoc/', '7b9'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/typeDoc/functions/default',
                component: ComponentCreator('/docs/typeDoc/functions/default', '909'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/typeDoc/variables/Log',
                component: ComponentCreator('/docs/typeDoc/variables/Log', '8ab'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/types',
                component: ComponentCreator('/docs/types', '3d2'),
                exact: true,
                sidebar: "tutorialSidebar"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    path: '/',
    component: ComponentCreator('/', 'e5f'),
    exact: true
  },
  {
    path: '*',
    component: ComponentCreator('*'),
  },
];
