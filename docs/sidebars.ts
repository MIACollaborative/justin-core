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
      ],
    },
    {
      type: 'category',
      label: 'API Reference',
      items: [
        {type: 'doc', id: 'reference/types'},
      ],
    },
    {
      type: 'category',
      label: 'Guides',
      items: [
        {type: 'doc', id: 'guides/mongo'},
      ],
    },
  ],
};

export default sidebars;
