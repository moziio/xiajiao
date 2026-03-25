import { defineConfig } from 'vitepress'

const zhNav = [
  { text: '指南', link: '/zh/guide/what-is-xiajiao' },
  { text: '功能', link: '/zh/features/multi-agent-chat' },
  { text: '部署', link: '/zh/deployment/local' },
  { text: '实战案例', link: '/zh/guide/recipes' },
  {
    text: '更多',
    items: [
      { text: 'SOUL.md 写作指南', link: '/zh/guide/soul-guide' },
      { text: 'SOUL.md 模板库', link: '/zh/guide/soul-templates' },
      { text: '平台对比', link: '/zh/guide/comparison' },
      { text: '安全与隐私', link: '/zh/guide/security' },
      { text: '迁移指南', link: '/zh/guide/migration' },
      { text: '架构设计', link: '/zh/guide/architecture' },
      { text: '常见问题', link: '/zh/guide/faq' },
      { text: '开发者指南', link: '/zh/guide/dev-guide' },
      { text: 'API 与协议参考', link: '/zh/guide/api-reference' },
      { text: '故障排查', link: '/zh/guide/troubleshooting' },
      { text: '术语表', link: '/zh/guide/glossary' },
      { text: '更新日志', link: '/zh/guide/changelog' },
      { text: '问题反馈', link: 'https://github.com/moziio/xiajiao/issues' },
      { text: '社区讨论', link: 'https://github.com/moziio/xiajiao/discussions' },
    ]
  }
]

const zhSidebar = {
  '/zh/guide/': [
    {
      text: '入门',
      items: [
        { text: '虾饺是什么', link: '/zh/guide/what-is-xiajiao' },
        { text: '快速开始', link: '/zh/guide/quick-start' },
        { text: '安装指南', link: '/zh/guide/installation' },
        { text: '模型配置', link: '/zh/guide/model-config' },
      ]
    },
    {
      text: '进阶',
      items: [
        { text: 'SOUL.md 写作指南', link: '/zh/guide/soul-guide' },
        { text: 'SOUL.md 模板库', link: '/zh/guide/soul-templates' },
        { text: '实战案例', link: '/zh/guide/recipes' },
        { text: '平台对比', link: '/zh/guide/comparison' },
        { text: '安全与隐私', link: '/zh/guide/security' },
        { text: '迁移指南', link: '/zh/guide/migration' },
        { text: '架构设计', link: '/zh/guide/architecture' },
      ]
    },
    {
      text: '参考',
      items: [
        { text: 'API 与协议参考', link: '/zh/guide/api-reference' },
        { text: '性能调优', link: '/zh/guide/performance' },
        { text: '故障排查', link: '/zh/guide/troubleshooting' },
        { text: '常见问题', link: '/zh/guide/faq' },
        { text: '术语表', link: '/zh/guide/glossary' },
      ]
    },
    {
      text: '开发',
      items: [
        { text: '开发者指南', link: '/zh/guide/dev-guide' },
        { text: '更新日志', link: '/zh/guide/changelog' },
      ]
    }
  ],
  '/zh/features/': [
    {
      text: '核心功能',
      items: [
        { text: '多 Agent 群聊', link: '/zh/features/multi-agent-chat' },
        { text: 'Tool Calling', link: '/zh/features/tool-calling' },
        { text: 'Agent 持久记忆', link: '/zh/features/agent-memory' },
        { text: 'RAG 知识库', link: '/zh/features/rag' },
        { text: '协作流', link: '/zh/features/collaboration-flow' },
        { text: '渠道接入', link: '/zh/features/integrations' },
      ]
    }
  ],
  '/zh/deployment/': [
    {
      text: '部署',
      items: [
        { text: '本地运行', link: '/zh/deployment/local' },
        { text: 'Docker 部署', link: '/zh/deployment/docker' },
        { text: '云服务器部署', link: '/zh/deployment/cloud' },
      ]
    }
  ],
}

const enNav = [
  { text: 'Guide', link: '/guide/what-is-xiajiao' },
  { text: 'Features', link: '/features/multi-agent-chat' },
  { text: 'Deploy', link: '/deployment/local' },
  { text: 'Recipes', link: '/guide/recipes' },
  {
    text: 'More',
    items: [
      { text: 'SOUL.md Guide', link: '/guide/soul-guide' },
      { text: 'SOUL.md Templates', link: '/guide/soul-templates' },
      { text: 'Comparison', link: '/guide/comparison' },
      { text: 'Security & Privacy', link: '/guide/security' },
      { text: 'Migration', link: '/guide/migration' },
      { text: 'Architecture', link: '/guide/architecture' },
      { text: 'FAQ', link: '/guide/faq' },
      { text: 'Developer Guide', link: '/guide/dev-guide' },
      { text: 'API Reference', link: '/guide/api-reference' },
      { text: 'Troubleshooting', link: '/guide/troubleshooting' },
      { text: 'Glossary', link: '/guide/glossary' },
      { text: 'Changelog', link: '/guide/changelog' },
      { text: 'Issues', link: 'https://github.com/moziio/xiajiao/issues' },
      { text: 'Discussions', link: 'https://github.com/moziio/xiajiao/discussions' },
    ]
  }
]

const enSidebar = {
  '/guide/': [
    {
      text: 'Getting Started',
      items: [
        { text: 'What is Xiajiao', link: '/guide/what-is-xiajiao' },
        { text: 'Quick Start', link: '/guide/quick-start' },
        { text: 'Installation', link: '/guide/installation' },
        { text: 'Model Config', link: '/guide/model-config' },
      ]
    },
    {
      text: 'Advanced',
      items: [
        { text: 'SOUL.md Guide', link: '/guide/soul-guide' },
        { text: 'SOUL.md Templates', link: '/guide/soul-templates' },
        { text: 'Recipes', link: '/guide/recipes' },
        { text: 'Comparison', link: '/guide/comparison' },
        { text: 'Security & Privacy', link: '/guide/security' },
        { text: 'Migration', link: '/guide/migration' },
        { text: 'Architecture', link: '/guide/architecture' },
      ]
    },
    {
      text: 'Reference',
      items: [
        { text: 'API Reference', link: '/guide/api-reference' },
        { text: 'Performance', link: '/guide/performance' },
        { text: 'Troubleshooting', link: '/guide/troubleshooting' },
        { text: 'FAQ', link: '/guide/faq' },
        { text: 'Glossary', link: '/guide/glossary' },
      ]
    },
    {
      text: 'Development',
      items: [
        { text: 'Developer Guide', link: '/guide/dev-guide' },
        { text: 'Changelog', link: '/guide/changelog' },
      ]
    }
  ],
  '/features/': [
    {
      text: 'Core Features',
      items: [
        { text: 'Multi-Agent Chat', link: '/features/multi-agent-chat' },
        { text: 'Tool Calling', link: '/features/tool-calling' },
        { text: 'Agent Memory', link: '/features/agent-memory' },
        { text: 'RAG Knowledge Base', link: '/features/rag' },
        { text: 'Collaboration Flow', link: '/features/collaboration-flow' },
        { text: 'Integrations', link: '/features/integrations' },
      ]
    }
  ],
  '/deployment/': [
    {
      text: 'Deployment',
      items: [
        { text: 'Local', link: '/deployment/local' },
        { text: 'Docker', link: '/deployment/docker' },
        { text: 'Cloud', link: '/deployment/cloud' },
      ]
    }
  ],
}

export default defineConfig({
  title: 'Xiajiao IM',
  description: 'AI Agent Team Collaboration — 6 deps, npm start, manage your AI team',
  base: '/xiajiao/',

  sitemap: { hostname: 'https://moziio.github.io/xiajiao' },

  head: [
    ['link', { rel: 'icon', href: '/xiajiao/logo.png' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: 'Xiajiao IM — AI Agent Team Collaboration' }],
    ['meta', { property: 'og:description', content: '6 npm deps, npm start to run. Multi-agent chat, collaboration flow, persistent memory, RAG.' }],
    ['meta', { property: 'og:image', content: 'https://moziio.github.io/xiajiao/images/hero-light-top.png' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'keywords', content: 'AI Agent, multi-agent, group chat, Tool Calling, RAG, memory, SOUL.md, open source, Node.js, Xiajiao' }],
  ],

  locales: {
    root: {
      label: 'English',
      lang: 'en',
    },
    zh: {
      label: '简体中文',
      lang: 'zh-CN',
      title: '虾饺 IM',
      description: 'AI Agent 团队协作平台 — 6 个依赖，npm start，管理你的 AI 团队',
      themeConfig: {
        logo: '/logo.png',
        siteTitle: '虾饺 IM',
        nav: zhNav,
        sidebar: zhSidebar,
        editLink: {
          pattern: 'https://github.com/moziio/xiajiao/edit/master/docs-site/:path',
          text: '在 GitHub 上编辑此页'
        },
        footer: {
          message: '基于 MIT 协议开源 · <a href="https://github.com/moziio/xiajiao">GitHub</a> · <a href="https://github.com/moziio/xiajiao/discussions">社区</a>',
          copyright: 'Copyright © 2026 虾饺 IM'
        },
        lastUpdated: { text: '最后更新于' },
        docFooter: { prev: '上一页', next: '下一页' },
        outline: { label: '页面导航', level: [2, 3] },
        returnToTopLabel: '回到顶部',
        sidebarMenuLabel: '菜单',
        darkModeSwitchLabel: '主题',
        search: {
          provider: 'local',
          options: {
            translations: {
              button: { buttonText: '搜索文档', buttonAriaLabel: '搜索文档' },
              modal: {
                noResultsText: '无法找到相关结果',
                resetButtonTitle: '清除查询条件',
                footer: { selectText: '选择', navigateText: '切换' }
              }
            }
          }
        },
      }
    }
  },

  /* Old Chinese URLs → /zh/* redirects are generated by scripts/gen-redirects.mjs */
  /* Run: node docs-site/scripts/gen-redirects.mjs  (after vitepress build) */

  themeConfig: {
    logo: '/logo.png',
    siteTitle: 'Xiajiao IM',
    nav: enNav,
    sidebar: enSidebar,

    socialLinks: [
      { icon: 'github', link: 'https://github.com/moziio/xiajiao' }
    ],

    search: { provider: 'local' },

    editLink: {
      pattern: 'https://github.com/moziio/xiajiao/edit/master/docs-site/:path',
      text: 'Edit this page on GitHub'
    },

    footer: {
      message: 'Released under the MIT License · <a href="https://github.com/moziio/xiajiao">GitHub</a> · <a href="https://github.com/moziio/xiajiao/discussions">Discussions</a>',
      copyright: 'Copyright © 2026 Xiajiao IM'
    },

    lastUpdated: { text: 'Last updated' },
    docFooter: { prev: 'Previous', next: 'Next' },
    outline: { label: 'On this page', level: [2, 3] },
    returnToTopLabel: 'Back to top',
    sidebarMenuLabel: 'Menu',
    darkModeSwitchLabel: 'Theme',
  }
})
