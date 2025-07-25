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
    component: ComponentCreator('/docs', 'd9d'),
    routes: [
      {
        path: '/docs',
        component: ComponentCreator('/docs', 'e4f'),
        routes: [
          {
            path: '/docs',
            component: ComponentCreator('/docs', 'a8e'),
            routes: [
              {
                path: '/docs/concepts',
                component: ComponentCreator('/docs/concepts', '27f'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/handlers',
                component: ComponentCreator('/docs/handlers', '7b1'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/intro',
                component: ComponentCreator('/docs/intro', '61d'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/typeDoc/',
                component: ComponentCreator('/docs/typeDoc/', '7af'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/typeDoc/functions/default',
                component: ComponentCreator('/docs/typeDoc/functions/default', '554'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/typeDoc/variables/Log',
                component: ComponentCreator('/docs/typeDoc/variables/Log', '994'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/types',
                component: ComponentCreator('/docs/types', '91a'),
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
