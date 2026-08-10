import { defineConfig, type HeadConfig, type TransformContext } from 'vitepress'

const docsOrigin = 'https://doc.file-viewer.app'

const githubSocialLink = {
  icon: {
    svg: '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z"></path></svg>'
  },
  ariaLabel: 'GitHub',
  link: 'https://github.com/flyfish-dev/file-viewer'
}

type NavItem = {
  text: string
  link?: string
  items?: NavItem[]
}

type SidebarGroup = {
  text: string
  items: Array<{
    text: string
    link: string
  }>
}

type Sidebar = Record<string, SidebarGroup[]>

function rewriteLink(link: string | undefined, fromPrefix: string, toPrefix: string) {
  if (!link?.startsWith(fromPrefix)) {
    return link
  }
  return `${toPrefix}${link.slice(fromPrefix.length)}`
}

function rewriteNavLinks(items: NavItem[], fromPrefix: string, toPrefix: string): NavItem[] {
  return items.map(item => ({
    ...item,
    link: rewriteLink(item.link, fromPrefix, toPrefix),
    items: item.items ? rewriteNavLinks(item.items, fromPrefix, toPrefix) : undefined
  }))
}

function rewriteSidebarLinks(sidebar: Sidebar, fromPrefix: string, toPrefix: string): Sidebar {
  return Object.fromEntries(
    Object.entries(sidebar).map(([key, groups]) => [
      rewriteLink(key, fromPrefix, toPrefix) ?? key,
      groups.map(group => ({
        ...group,
        items: group.items.map(item => ({
          ...item,
          link: rewriteLink(item.link, fromPrefix, toPrefix) ?? item.link
        }))
      }))
    ])
  )
}

const enNav: NavItem[] = [
  { text: 'Docs', link: '/en/guide/' },
  { text: 'Quickstart', link: '/en/guide/quickstart' },
  { text: 'Ecosystem', link: '/en/guide/ecosystem' },
  { text: 'Formats', link: '/en/guide/formats' },
  {
    text: 'Resources',
    items: [
      { text: 'Live Demo', link: 'https://demo.file-viewer.app' },
      { text: 'Compare Demo', link: 'https://demo.file-viewer.app/compare.html' },
      { text: 'npm Core', link: 'https://www.npmjs.com/package/@file-viewer/core' },
      { text: 'npm Web Component', link: 'https://www.npmjs.com/package/@file-viewer/web' },
      { text: 'npm Vue 3', link: 'https://www.npmjs.com/package/@file-viewer/vue3' },
      { text: 'npm React', link: 'https://www.npmjs.com/package/@file-viewer/react' },
      { text: 'npm Svelte', link: 'https://www.npmjs.com/package/@file-viewer/svelte' },
      { text: 'GitHub Repository', link: 'https://github.com/flyfish-dev/file-viewer' },
      { text: 'GitHub Wiki', link: 'https://github.com/flyfish-dev/file-viewer/wiki' },
      { text: 'GitHub Sponsors', link: 'https://github.com/sponsors/wybaby168' },
      { text: 'Enterprise Support', link: 'https://dev.flyfish.group/shop' }
    ]
  }
]

const enSidebar: Sidebar = {
  '/en/guide/': [
    {
      text: 'Start Here',
      items: [
        { text: 'Docs Home', link: '/en/guide/' },
        { text: 'Overview', link: '/en/guide/overview' },
        { text: 'Demo Guide', link: '/en/guide/demo' },
        { text: 'Quickstart', link: '/en/guide/quickstart' }
      ]
    },
    {
      text: 'Integration',
      items: [
        { text: 'Ecosystem Packages', link: '/en/guide/ecosystem' },
        { text: 'Modular Assembly', link: '/en/guide/on-demand-renderers' },
        { text: 'Vanilla JS / Script Tag', link: '/en/guide/quickstart-web' },
        { text: 'Vue 3', link: '/en/guide/quickstart-vue3' },
        { text: 'Vue 2.7 / 2.6', link: '/en/guide/quickstart-vue2' },
        { text: 'React', link: '/en/guide/quickstart-react' },
        { text: 'React Legacy', link: '/en/guide/ecosystem#react-legacy' },
        { text: 'jQuery', link: '/en/guide/ecosystem#jquery' },
        { text: 'Svelte', link: '/en/guide/ecosystem#svelte' },
        { text: 'Core API', link: '/en/guide/ecosystem#core-api' },
        { text: 'PPT / PPTX Engines', link: '/en/guide/ecosystem#ppt-and-pptx-engines' },
        { text: 'Component Options', link: '/en/guide/usage' },
        { text: 'Style Isolation', link: '/en/guide/style-isolation' }
      ]
    },
    {
      text: 'Capability',
      items: [
        { text: 'Supported Formats', link: '/en/guide/formats' },
        { text: 'Format Fidelity', link: '/en/guide/format-fidelity' },
        { text: 'Comparison', link: '/en/guide/compare' },
        { text: 'FAQ', link: '/en/guide/faq' }
      ]
    },
    {
      text: 'Development And Release',
      items: [
        { text: 'Local Development', link: '/en/guide/development' },
        { text: 'Docker Deployment', link: '/en/guide/docker' },
        { text: 'Distribution', link: '/en/guide/distribution' }
      ]
    },
    {
      text: 'More',
      items: [
        { text: 'Changelog', link: '/changelog' },
        { text: 'Sponsor', link: '/en/donate' }
      ]
    }
  ]
}

const zhNav: NavItem[] = [
  { text: '文档', link: '/zh/guide/' },
  { text: '快速开始', link: '/zh/guide/quickstart' },
  { text: '生态接入', link: '/zh/guide/ecosystem' },
  { text: '支持格式', link: '/zh/guide/formats' },
  {
    text: '资源',
    items: [
      { text: '官方文档', link: 'https://doc.file-viewer.app' },
      { text: '官网门户', link: 'https://file-viewer.app' },
      { text: '在线 Demo', link: 'https://demo.file-viewer.app' },
      { text: 'npm Core', link: 'https://www.npmjs.com/package/@file-viewer/core' },
      { text: 'npm Vanilla JS / Pure Web', link: 'https://www.npmjs.com/package/@file-viewer/web' },
      { text: 'npm Vue3', link: 'https://www.npmjs.com/package/@file-viewer/vue3' },
      { text: 'npm React', link: 'https://www.npmjs.com/package/@file-viewer/react' },
      { text: 'npm Svelte', link: 'https://www.npmjs.com/package/@file-viewer/svelte' },
      { text: 'GitHub 开源总仓库', link: 'https://github.com/flyfish-dev/file-viewer' },
      { text: 'GitHub Wiki', link: 'https://github.com/flyfish-dev/file-viewer/wiki' },
      { text: 'Gitee 开源总仓库', link: 'https://gitee.com/flyfish-dev/file-viewer' },
      { text: 'GitHub Sponsors', link: 'https://github.com/sponsors/wybaby168' },
      { text: '国内赞赏', link: 'https://dev.flyfish.group/sponsor?source=github' },
      { text: '企业技术支持', link: 'https://dev.flyfish.group/shop' }
    ]
  }
]

const zhSidebar: Sidebar = {
  '/zh/guide/': [
    {
      text: '开始阅读',
      items: [
        { text: '文档导览', link: '/zh/guide/' },
        { text: '概述', link: '/zh/guide/overview' },
        { text: 'Demo 说明', link: '/zh/guide/demo' },
        { text: '快速开始', link: '/zh/guide/quickstart' }
      ]
    },
    {
      text: '集成方式',
      items: [
        { text: '生态组件总览', link: '/zh/guide/ecosystem' },
        { text: '模块化与按需装配', link: '/zh/guide/on-demand-renderers#_2-1-0-推荐接入步骤' },
        { text: '纯 JS / Script 标签集成', link: '/zh/guide/quickstart-web' },
        { text: 'Vue3 集成', link: '/zh/guide/quickstart-vue3' },
        { text: 'Vue2.7 / 2.6 集成', link: '/zh/guide/quickstart-vue2' },
        { text: 'React 集成', link: '/zh/guide/quickstart-react' },
        { text: 'React Legacy 集成', link: '/zh/guide/ecosystem#react-legacy' },
        { text: 'jQuery 集成', link: '/zh/guide/ecosystem#jquery' },
        { text: 'Svelte 集成', link: '/zh/guide/ecosystem#svelte' },
        { text: 'Core 自定义接入', link: '/zh/guide/ecosystem#core' },
        { text: 'PPT / PPTX 引擎接入', link: '/zh/guide/ecosystem#ppt-与-pptx-引擎接入' },
        { text: '组件用法', link: '/zh/guide/usage' },
        { text: '样式隔离与定制', link: '/zh/guide/style-isolation' }
      ]
    },
    {
      text: '能力与边界',
      items: [
        { text: '支持格式', link: '/zh/guide/formats' },
        { text: '格式完整度', link: '/zh/guide/format-fidelity' },
        { text: '方案对比', link: '/zh/guide/compare' },
        { text: '按需渲染架构', link: '/zh/guide/on-demand-renderers' },
        { text: '常见问题', link: '/zh/guide/faq' }
      ]
    },
    {
      text: '开发与发布',
      items: [
        { text: '本地开发与打包', link: '/zh/guide/development' },
        { text: 'Docker 部署', link: '/zh/guide/docker' },
        { text: '发布与开源分发', link: '/zh/guide/distribution' }
      ]
    },
    {
      text: '更多信息',
      items: [
        { text: '更新日志', link: '/changelog' },
        { text: '赞助项目', link: '/zh/donate' }
      ]
    }
  ]
}

const enSearch = {
  provider: 'local' as const,
  options: {
    locales: {
      root: {
        translations: {
          button: {
            buttonText: 'Search docs',
            buttonAriaLabel: 'Search docs'
          },
          modal: {
            displayDetails: 'Display details',
            resetButtonTitle: 'Reset search',
            backButtonTitle: 'Back',
            noResultsText: 'No results found',
            footer: {
              selectText: 'select',
              navigateText: 'navigate',
              closeText: 'close'
            }
          }
        }
      }
    }
  }
}

const zhSearch = {
  provider: 'local' as const,
  options: {
    locales: {
      root: {
        translations: {
          button: {
            buttonText: '搜索文档',
            buttonAriaLabel: '搜索文档'
          },
          modal: {
            displayDetails: '显示详情',
            resetButtonTitle: '清空搜索',
            backButtonTitle: '返回',
            noResultsText: '没有找到相关内容',
            footer: {
              selectText: '选择',
              navigateText: '切换',
              closeText: '关闭'
            }
          }
        }
      }
    }
  }
}

const rootEnNav = rewriteNavLinks(enNav, '/en/', '/')
const rootEnSidebar = rewriteSidebarLinks(enSidebar, '/en/', '/')

function cleanPathFromPage(relativePath: string) {
  const isIndexPage = /(^|\/)index\.md$/.test(relativePath)
  const withoutIndex = relativePath.replace(/(^|\/)index\.md$/, '$1')
  const withoutExtension = withoutIndex.replace(/\.md$/, '')
  const normalized = `/${withoutExtension}`.replace(/\/+/g, '/')
  if (isIndexPage) {
    return normalized.endsWith('/') ? normalized : `${normalized}/`
  }
  return normalized.replace(/\/$/, '')
}

function canonicalPathForPage(relativePath: string) {
  const path = cleanPathFromPage(relativePath)
  if (path === '/en/') {
    return '/'
  }
  if (path.startsWith('/en/')) {
    return path.replace(/^\/en\//, '/')
  }
  return path
}

function englishPathForCanonical(canonicalPath: string) {
  if (canonicalPath === '/zh/') {
    return '/'
  }
  if (canonicalPath.startsWith('/zh/')) {
    return canonicalPath.replace(/^\/zh\//, '/')
  }
  return canonicalPath
}

function zhPathForEnglish(englishPath: string) {
  return englishPath === '/' ? '/zh/' : `/zh${englishPath}`
}

function languageAlternates(canonicalPath: string): HeadConfig[] {
  const englishPath = englishPathForCanonical(canonicalPath)
  const zhPath = zhPathForEnglish(englishPath)
  return [
    ['link', { rel: 'alternate', hreflang: 'en', href: `${docsOrigin}${englishPath}` }],
    ['link', { rel: 'alternate', hreflang: 'zh-CN', href: `${docsOrigin}${zhPath}` }],
    ['link', { rel: 'alternate', hreflang: 'x-default', href: `${docsOrigin}${englishPath}` }]
  ]
}

function seoHead({ pageData }: TransformContext): HeadConfig[] {
  const canonicalPath = canonicalPathForPage(pageData.relativePath)
  const canonicalUrl = `${docsOrigin}${canonicalPath}`
  return [
    ['link', { rel: 'canonical', href: canonicalUrl }],
    ...languageAlternates(canonicalPath),
    ['meta', { property: 'og:url', content: canonicalUrl }]
  ]
}

function isLegacyEnglishSitemapUrl(url: string) {
  return url === 'en/' || url.startsWith('en/') || url === '/en/' || url.startsWith('/en/')
}

function stripLegacyEnglishSitemapLinks<T extends { links?: Array<{ url: string }> }>(item: T): T {
  if (!item.links?.length) {
    return item
  }
  return {
    ...item,
    links: item.links.filter(link => !isLegacyEnglishSitemapUrl(link.url))
  }
}

export default defineConfig({
  lang: 'en-US',
  title: 'File Viewer',
  description: 'Browser-native file preview for internal web apps, covering 208 extensions across 25 preview pipelines without server-side conversion.',
  cleanUrls: true,
  lastUpdated: true,
  sitemap: {
    hostname: docsOrigin,
    transformItems: items => items
      .filter(item => !isLegacyEnglishSitemapUrl(item.url))
      .map(stripLegacyEnglishSitemapLinks)
  },
  transformHead: seoHead,
  locales: {
    root: {
      label: 'English',
      lang: 'en-US'
    },
    zh: {
      label: '简体中文',
      lang: 'zh-CN',
      link: '/zh/',
      title: 'File Viewer',
      description: '面向企业后台、内网和私有化系统的纯前端文件预览组件，无需服务端转码，覆盖 208 个扩展名和 25 条预览链路。',
      themeConfig: {
        logo: '/_media/logo.png',
        nav: zhNav,
        sidebar: zhSidebar,
        outline: { level: [2, 3], label: '本页导航' },
        docFooter: {
          prev: '上一页',
          next: '下一页'
        },
        lastUpdatedText: '最近更新',
        search: zhSearch,
        socialLinks: [githubSocialLink],
        footer: {
          message: 'Released under the Apache-2.0 License.',
          copyright: 'Copyright © 2026 File Viewer by Flyfish'
        }
      }
    },
    en: {
      label: 'English',
      lang: 'en-US',
      link: '/en/',
      title: 'File Viewer',
      description: 'Browser-native file preview for internal web apps, covering 208 extensions across 25 preview pipelines without server-side conversion.',
      themeConfig: {
        logo: '/_media/logo.png',
        nav: enNav,
        sidebar: enSidebar,
        outline: { level: [2, 3], label: 'On This Page' },
        docFooter: {
          prev: 'Previous page',
          next: 'Next page'
        },
        lastUpdatedText: 'Last updated',
        search: enSearch,
        socialLinks: [githubSocialLink],
        footer: {
          message: 'Released under the Apache-2.0 License.',
          copyright: 'Copyright © 2026 File Viewer by Flyfish'
        }
      }
    }
  },
  head: [
    ['meta', { name: 'theme-color', content: '#31a66f' }],
    ['meta', { name: 'robots', content: 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1' }],
    ['meta', { property: 'og:title', content: 'File Viewer' }],
    ['meta', { property: 'og:description', content: 'Browser-native file preview for internal web apps, covering 208 extensions across 25 preview pipelines without server-side conversion.' }],
    ['meta', { property: 'og:image', content: 'https://doc.file-viewer.app/_media/social-preview.png' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:image', content: 'https://doc.file-viewer.app/_media/social-preview.png' }],
    ['link', { rel: 'sitemap', type: 'application/xml', href: 'https://doc.file-viewer.app/sitemap.xml' }],
    ['link', { rel: 'alternate', type: 'text/plain', href: 'https://doc.file-viewer.app/llms.txt', title: 'File Viewer documentation index' }]
  ],
  themeConfig: {
    logo: '/_media/logo.png',
    nav: rootEnNav,
    sidebar: rootEnSidebar,
    outline: { level: [2, 3], label: 'On This Page' },
    docFooter: {
      prev: 'Previous page',
      next: 'Next page'
    },
    lastUpdatedText: 'Last updated',
    search: enSearch,
    socialLinks: [
      githubSocialLink
    ],
    footer: {
      message: 'Released under the Apache-2.0 License.',
      copyright: 'Copyright © 2026 File Viewer by Flyfish'
    }
  }
})
