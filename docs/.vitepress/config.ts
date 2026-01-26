import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'AXIOM',
  description: 'Multi-agent AI coding orchestrator',

  head: [
    ['link', { rel: 'icon', href: '/favicon.ico' }]
  ],

  themeConfig: {
    logo: '/logo.svg',

    nav: [
      { text: 'Guide', link: '/00-overview' },
      { text: 'Reference', link: '/13-reference' },
      { text: 'GitHub', link: 'https://github.com/deligoez/chorus' }
    ],

    sidebar: [
      {
        text: 'Getting Started',
        items: [
          { text: 'Overview', link: '/00-overview' },
          { text: 'Configuration', link: '/01-configuration' },
          { text: 'Operating Modes', link: '/02-modes' }
        ]
      },
      {
        text: 'Planning',
        items: [
          { text: 'Planning System', link: '/03-planning' },
          { text: 'Case Management', link: '/04-cases' }
        ]
      },
      {
        text: 'Agents',
        items: [
          { text: 'Agent Personas', link: '/05-agents' },
          { text: 'Integration Service', link: '/06-integration' },
          { text: 'Execution Loop', link: '/07-execution' }
        ]
      },
      {
        text: 'Systems',
        items: [
          { text: 'Discovery System', link: '/08-discovery' },
          { text: 'Intervention', link: '/09-intervention' },
          { text: 'Web Interface', link: '/10-interface' },
          { text: 'Review & Debrief', link: '/11-review' },
          { text: 'Hooks System', link: '/12-hooks' }
        ]
      },
      {
        text: 'Reference',
        items: [
          { text: 'Quick Reference', link: '/13-reference' },
          { text: 'Prompts', link: '/14-prompts' },
          { text: 'Error Handling', link: '/15-errors' },
          { text: 'Glossary', link: '/16-glossary' }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/deligoez/chorus' }
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024-present'
    },

    search: {
      provider: 'local'
    }
  }
})
