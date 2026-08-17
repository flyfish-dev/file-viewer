'use client';

import { useState } from 'react';
import {
  IconBox,
  IconCheck,
  IconCode,
  IconCopy,
  IconPackage,
  IconPlugConnected,
  IconRocket,
} from '@tabler/icons-react';

const examples = {
  vanilla: {
    label: 'Vanilla JS',
    install: 'pnpm add @file-viewer/web-full',
    code: `<script type="module">\n  import '@file-viewer/web-full'\n</script>\n\n<flyfish-file-viewer\n  src="/files/report.pdf"\n  style="height: 720px"\n/>`,
  },
  vue: {
    label: 'Vue 3',
    install: 'pnpm add @file-viewer/vue3-full',
    code: `<script setup lang="ts">\nimport FileViewer from '@file-viewer/vue3-full'\n</script>\n\n<template>\n  <FileViewer url="/files/report.pdf" />\n</template>`,
  },
  react: {
    label: 'React',
    install: 'pnpm add @file-viewer/react-full',
    code: `import { FileViewer } from '@file-viewer/react-full'\n\nexport function Preview() {\n  return <FileViewer url="/files/report.pdf" />\n}`,
  },
} as const;

type ExampleKey = keyof typeof examples;

export function QuickstartWorkbench({ locale }: { locale: 'en' | 'zh' }) {
  const [active, setActive] = useState<ExampleKey>('vanilla');
  const [copied, setCopied] = useState(false);
  const example = examples[active];
  const chinese = locale === 'zh';
  const steps = [
    {
      icon: IconPackage,
      title: chinese ? '选择原生组件包' : 'Pick the native component',
      text: chinese ? '从 Web Component 开始，或使用你的框架组件。' : 'Start with Web Component, or use your framework-native package.',
    },
    {
      icon: IconBox,
      title: chinese ? '确定能力边界' : 'Choose the capability layer',
      text: chinese ? 'Full 包开箱即用；标准包按需组合 preset。' : 'Use Full for the complete matrix, or compose presets on demand.',
    },
    {
      icon: IconPlugConnected,
      title: chinese ? '发布离线资源' : 'Publish offline assets',
      text: chinese ? 'Worker、WASM 与字体全部走本地同源路径。' : 'Keep Workers, WASM, and fonts on local same-origin paths.',
    },
    {
      icon: IconCode,
      title: chinese ? '传入文件与选项' : 'Pass the file and options',
      text: chinese ? '支持 URL、File 与统一 options 契约。' : 'Use a URL or File with one shared options contract.',
    },
    {
      icon: IconRocket,
      title: chinese ? '验证真实格式' : 'Verify real formats',
      text: chinese ? '用你的 PDF、Office、CAD 与压缩包完成上线前验证。' : 'Test your PDF, Office, CAD, and archive samples before shipping.',
    },
  ];

  async function copyExample() {
    await navigator.clipboard.writeText(`${example.install}\n\n${example.code}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <section className="fv-workbench" aria-labelledby="fv-workbench-title">
      <div className="fv-workbench__intro">
        <span className="fv-section-label">{chinese ? '推荐路径' : 'Recommended path'}</span>
        <h2 id="fv-workbench-title">{chinese ? '五步完成集成' : 'Integrate in five clear steps'}</h2>
        <p>
          {chinese
            ? '先跑通最小路径，再补充按需能力。每一步都对应真实的发布边界。'
            : 'Run the smallest path first, then add only the capabilities your product needs.'}
        </p>
      </div>
      <div className="fv-workbench__grid">
        <ol className="fv-steps">
          {steps.map((step, index) => {
            const StepIcon = step.icon;
            return (
              <li key={step.title}>
                <span className="fv-step__rail" aria-hidden="true" />
                <span className="fv-step__icon"><StepIcon size={18} stroke={1.8} /></span>
                <span className="fv-step__copy">
                  <span className="fv-step__number">0{index + 1}</span>
                  <strong>{step.title}</strong>
                  <span>{step.text}</span>
                </span>
              </li>
            );
          })}
        </ol>
        <div className="fv-code-demo">
          <div className="fv-code-tabs" role="tablist" aria-label={chinese ? '集成方式' : 'Integration options'}>
            {(Object.keys(examples) as ExampleKey[]).map((key) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={active === key}
                className={active === key ? 'is-active' : undefined}
                onClick={() => setActive(key)}
              >
                {examples[key].label}
              </button>
            ))}
          </div>
          <div className="fv-install-line">
            <IconCheck size={15} stroke={2.2} aria-hidden="true" />
            <code>{example.install}</code>
            <button type="button" onClick={copyExample} aria-label={chinese ? '复制当前代码示例' : 'Copy current code example'}>
              {copied ? <IconCheck size={14} stroke={2.2} aria-hidden="true" /> : <IconCopy size={14} stroke={1.9} aria-hidden="true" />}
              <span>{copied ? (chinese ? '已复制' : 'Copied') : (chinese ? '复制' : 'Copy')}</span>
            </button>
          </div>
          <pre aria-live="polite"><code>{example.code}</code></pre>
          <a href={locale === 'zh' ? '/zh/guide/quickstart-web' : '/guide/quickstart-web'}>
            {chinese ? '查看完整集成指南' : 'Open the complete integration guide'}
            <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>
    </section>
  );
}
