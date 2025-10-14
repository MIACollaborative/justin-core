import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    {type: 'doc', id: 'using'},
    {
      type: 'category',
      label: 'Concepts',
      items: [
        {type: 'doc', id: 'concepts/overview'},
        {type: 'doc', id: 'concepts/handlers'},
        {type: 'doc', id: 'concepts/events'},
        {type: 'doc', id: 'concepts/users'},
        {type: 'doc', id: 'concepts/logging'}
      ],
    },
    {
      type: 'category',
      label: 'Guides',
      items: [
        {type: 'doc', id: 'guides/mongo'},
        {type: 'doc', id: 'guides/gcp'},
      ],
    },
    {
      type: 'category',
      label: 'API Reference',
      link: {
        type: 'generated-index',
        title: 'API Reference',
        description: 'Complete API documentation for JustIn Core',
      },
      items: require('./api-sidebar.js'),
    },
  ],
};

export default sidebars;
