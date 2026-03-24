import { defineConfig } from 'vitepress'

export default defineConfig({
  title: '虾饺 IM',
  description: 'AI Agent 团队协作平台 — 6 个依赖，npm start，管理你的 AI 团队',
  lang: 'zh-CN',
  base: '/xiajiao/',

  sitemap: { hostname: 'https://moziio.github.io/xiajiao' },

  head: [
    ['link', { rel: 'icon', href: '/xiajiao/logo.svg' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: '虾饺 IM — AI Agent 团队协作平台' }],
    ['meta', { property: 'og:description', content: '6 个 npm 依赖，npm start 即跑。多 Agent 群聊、协作流、持久记忆、RAG 知识库。' }],
    ['meta', { property: 'og:image', content: 'https://moziio.github.io/xiajiao/images/hero-light-top.png' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'keywords', content: 'AI Agent, 多Agent协作, 群聊, Tool Calling, RAG, 持久记忆, SOUL.md, 开源, Node.js, 虾饺' }],
  ],

  themeConfig: {
    logo: '/logo.svg',
    siteTitle: '虾饺 IM',

    nav: [
      { text: '指南', link: '/guide/what-is-xiajiao' },
      { text: '功能', link: '/features/multi-agent-chat' },
      { text: '部署', link: '/deployment/local' },
      { text: '实战案例', link: '/guide/recipes' },
      {
        text: '更多',
        items: [
          { text: 'SOUL.md 写作指南', link: '/guide/soul-guide' },
          { text: 'SOUL.md 模板库', link: '/guide/soul-templates' },
          { text: '平台对比', link: '/guide/comparison' },
          { text: '安全与隐私', link: '/guide/security' },
          { text: '架构设计', link: '/guide/architecture' },
          { text: '常见问题', link: '/guide/faq' },
          { text: '开发者指南', link: '/guide/dev-guide' },
          { text: 'API 与协议参考', link: '/guide/api-reference' },
          { text: '故障排查', link: '/guide/troubleshooting' },
          { text: '术语表', link: '/guide/glossary' },
          { text: '---', link: '' },
          { text: '更新日志', link: 'https://github.com/moziio/xiajiao/blob/master/CHANGELOG.md' },
          { text: '贡献指南', link: 'https://github.com/moziio/xiajiao/blob/master/CONTRIBUTING.md' },
          { text: '问题反馈', link: 'https://github.com/moziio/xiajiao/issues' },
          { text: '社区讨论', link: 'https://github.com/moziio/xiajiao/discussions' },
        ]
      }
    ],

    sidebar: {
      '/guide/': [
        {
          text: '入门',
          items: [
            { text: '虾饺是什么', link: '/guide/what-is-xiajiao' },
            { text: '快速开始', link: '/guide/quick-start' },
            { text: '安装指南', link: '/guide/installation' },
            { text: '模型配置', link: '/guide/model-config' },
          ]
        },
        {
          text: '进阶',
          items: [
            { text: 'SOUL.md 写作指南', link: '/guide/soul-guide' },
            { text: 'SOUL.md 模板库', link: '/guide/soul-templates' },
            { text: '实战案例', link: '/guide/recipes' },
            { text: '平台对比', link: '/guide/comparison' },
            { text: '安全与隐私', link: '/guide/security' },
            { text: '架构设计', link: '/guide/architecture' },
          ]
        },
        {
          text: '参考',
          items: [
            { text: 'API 与协议参考', link: '/guide/api-reference' },
            { text: '性能调优', link: '/guide/performance' },
            { text: '故障排查', link: '/guide/troubleshooting' },
            { text: '常见问题', link: '/guide/faq' },
            { text: '术语表', link: '/guide/glossary' },
          ]
        },
        {
          text: '开发',
          items: [
            { text: '开发者指南', link: '/guide/dev-guide' },
            { text: '更新日志', link: '/guide/changelog' },
          ]
        }
      ],
      '/features/': [
        {
          text: '核心功能',
          items: [
            { text: '多 Agent 群聊', link: '/features/multi-agent-chat' },
            { text: 'Tool Calling', link: '/features/tool-calling' },
            { text: 'Agent 持久记忆', link: '/features/agent-memory' },
            { text: 'RAG 知识库', link: '/features/rag' },
            { text: '协作流', link: '/features/collaboration-flow' },
            { text: '渠道接入', link: '/features/integrations' },
          ]
        }
      ],
      '/deployment/': [
        {
          text: '部署',
          items: [
            { text: '本地运行', link: '/deployment/local' },
            { text: 'Docker 部署', link: '/deployment/docker' },
            { text: '云服务器部署', link: '/deployment/cloud' },
          ]
        }
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/moziio/xiajiao' }
    ],

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

    editLink: {
      pattern: 'https://github.com/moziio/xiajiao/edit/master/docs-site/:path',
      text: '在 GitHub 上编辑此页'
    },

    footer: {
      message: '基于 MIT 协议开源 · <a href="https://github.com/moziio/xiajiao">GitHub</a> · <a href="https://github.com/moziio/xiajiao/discussions">社区</a>',
      copyright: 'Copyright © 2026 虾饺 IM'
    },

    lastUpdated: {
      text: '最后更新于'
    },

    docFooter: {
      prev: '上一页',
      next: '下一页'
    },

    outline: {
      label: '页面导航',
      level: [2, 3]
    },

    returnToTopLabel: '回到顶部',
    sidebarMenuLabel: '菜单',
    darkModeSwitchLabel: '主题',
  }
})
