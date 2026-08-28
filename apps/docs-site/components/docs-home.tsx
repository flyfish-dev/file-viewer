import {
  IconArrowRight,
  IconBraces,
  IconCloudLock,
  IconFileSearch,
  IconLayersLinked,
  IconServerOff,
  IconStack2,
  IconTerminal2,
} from '@tabler/icons-react';
import { DocsPage } from 'fumadocs-ui/layouts/docs/page';
import { localePath } from '@/lib/shared';
import { QuickstartWorkbench } from './quickstart-workbench';

export function DocsHome({ locale }: { locale: 'en' | 'zh' }) {
  const chinese = locale === 'zh';
  const routes = [
    {
      icon: IconTerminal2,
      title: chinese ? '使用 CLI 创建或接入' : 'Create or integrate with the CLI',
      text: chinese ? '选择框架、版本与格式，或检测现有项目后生成可审阅计划。' : 'Choose frameworks, versions, and formats, or inspect an existing project before applying a reviewable plan.',
      href: localePath(locale, 'guide/cli'),
    },
    {
      icon: IconBraces,
      title: chinese ? '选择原生组件' : 'Choose a native component',
      text: chinese ? 'Vanilla、Web Component、Vue、React、Svelte 与 jQuery。' : 'Vanilla, Web Component, Vue, React, Svelte, and jQuery.',
      href: localePath(locale, 'guide/ecosystem'),
    },
    {
      icon: IconCloudLock,
      title: chinese ? '完成私有部署' : 'Ship self-hosted',
      text: chinese ? 'Worker、WASM、字体和 vendor 资源全部走本地同源路径。' : 'Keep Workers, WASM, fonts, and vendor assets on your own origin.',
      href: localePath(locale, 'guide/distribution'),
    },
  ];

  const guarantees = [
    [IconServerOff, chinese ? '不依赖服务端转码' : 'No conversion server'],
    [IconFileSearch, chinese ? '真实格式能力矩阵' : 'Auditable format matrix'],
    [IconLayersLinked, chinese ? '按需渲染与 Full 包并存' : 'Modular and Full paths'],
    [IconStack2, chinese ? '静态 HTML 与原始 Markdown' : 'Static HTML and raw Markdown'],
  ] as const;

  return (
    <DocsPage toc={[]}>
      <article className="fv-home">
        <section className="fv-home-hero" aria-labelledby="fv-home-title">
          <div className="fv-home-hero__copy">
            <span className="fv-home-eyebrow">{chinese ? 'File Viewer 开发文档' : 'File Viewer developer documentation'}</span>
            <h1 id="fv-home-title">
              {chinese ? '让文件留在浏览器，把预览能力交给产品。' : 'Preview private files. Keep every byte in the browser.'}
            </h1>
            <p>
              {chinese
                ? '从原生组件开始，按业务文件类型选择 renderer、preset 或 Full 包，并把所有运行时资源部署到自己的同源地址。'
                : 'Start with a native component, choose renderers, presets, or a Full package, and self-host every runtime asset on your own origin.'}
            </p>
            <div className="fv-home-hero__actions">
              <a className="is-primary" href={localePath(locale, 'guide/quickstart')}>
                {chinese ? '开始集成' : 'Start integrating'}
                <IconArrowRight size={17} stroke={2} aria-hidden="true" />
              </a>
              <a href={localePath(locale, 'guide/formats')}>
                {chinese ? '查看格式矩阵' : 'Explore format coverage'}
              </a>
            </div>
          </div>

          <div className="fv-home-map" aria-label={chinese ? 'File Viewer 集成架构' : 'File Viewer integration architecture'}>
            <div className="fv-home-map__head">
              <span>{chinese ? '推荐交付路径' : 'Recommended delivery path'}</span>
              <strong>{chinese ? '浏览器原生' : 'Browser-native'}</strong>
            </div>
            <ol>
              <li>
                <span>01</span>
                <div><strong>{chinese ? '组件层' : 'Component'}</strong><small>Web · Vue · React · Svelte</small></div>
              </li>
              <li>
                <span>02</span>
                <div><strong>{chinese ? '能力层' : 'Capability'}</strong><small>Renderer · Preset · Full</small></div>
              </li>
              <li>
                <span>03</span>
                <div><strong>{chinese ? '资源层' : 'Runtime assets'}</strong><small>Worker · WASM · Fonts</small></div>
              </li>
            </ol>
            <div className="fv-home-map__result">
              <span aria-hidden="true" />
              <div><strong>{chinese ? '文件在本地完成解析与渲染' : 'Files parse and render locally'}</strong><small>{chinese ? '同源、离线优先、可私有化' : 'Same-origin · offline-first · self-hosted'}</small></div>
            </div>
          </div>
        </section>

        <dl className="fv-home-facts">
          <div><dt>244</dt><dd>{chinese ? '个已注册扩展名' : 'registered extensions'}</dd></div>
          <div><dt>34</dt><dd>{chinese ? '条预览链路' : 'preview pipelines'}</dd></div>
          <div><dt>100%</dt><dd>{chinese ? '运行时资源可自托管' : 'self-hostable runtime'}</dd></div>
        </dl>

        <section className="fv-home-routes" aria-labelledby="fv-home-routes-title">
          <div className="fv-home-section-heading">
            <span className="fv-section-label">{chinese ? '清晰入口' : 'Clear entry points'}</span>
            <h2 id="fv-home-routes-title">{chinese ? '选择与你当前目标最接近的路径' : 'Choose the path closest to your goal'}</h2>
          </div>
          <div className="fv-home-route-grid">
            {routes.map(route => {
              const RouteIcon = route.icon;
              return (
                <a key={route.href} href={route.href}>
                  <RouteIcon size={21} stroke={1.75} aria-hidden="true" />
                  <strong>{route.title}</strong>
                  <span>{route.text}</span>
                  <IconArrowRight size={16} stroke={1.9} aria-hidden="true" />
                </a>
              );
            })}
          </div>
        </section>

        <QuickstartWorkbench locale={locale} />

        <section className="fv-home-guarantees" aria-labelledby="fv-home-guarantees-title">
          <div className="fv-home-section-heading">
            <span className="fv-section-label">{chinese ? '工程边界' : 'Engineering guarantees'}</span>
            <h2 id="fv-home-guarantees-title">{chinese ? '上线前能逐项核验' : 'Everything is verifiable before release'}</h2>
          </div>
          <div>
            {guarantees.map(([GuaranteeIcon, label]) => (
              <span key={label}><GuaranteeIcon size={18} stroke={1.8} aria-hidden="true" />{label}</span>
            ))}
          </div>
        </section>
      </article>
    </DocsPage>
  );
}
