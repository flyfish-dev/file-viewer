import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(appRoot, '../..');
const sourceRoot = join(repoRoot, 'docs');
const contentRoot = join(appRoot, 'content', 'docs');
const publicRoot = join(appRoot, 'public');

const rootPages = ['changelog', 'donate'];
const guideOrder = [
  'index',
  '---Start here---',
  'overview',
  'demo',
  'quickstart',
  '---Integration---',
  'ecosystem',
  'on-demand-renderers',
  'quickstart-web',
  'quickstart-vue3',
  'quickstart-vue2',
  'quickstart-react',
  'quickstart-svelte',
  '[React Legacy](/guide/ecosystem#react-legacy)',
  '[jQuery](/guide/ecosystem#jquery)',
  '[Core API](/guide/ecosystem#core-api)',
  '[PPT / PPTX Engines](/guide/ecosystem#ppt-and-pptx-engines)',
  'usage',
  'style-isolation',
  '---Capability---',
  'formats',
  'format-fidelity',
  'compare',
  'faq',
  '---Development and release---',
  'development',
  'docker',
  'distribution',
];

const guideOrderZh = [
  'index',
  '---开始阅读---',
  'overview',
  'demo',
  'quickstart',
  '---集成方式---',
  'ecosystem',
  'on-demand-renderers',
  'quickstart-web',
  'quickstart-vue3',
  'quickstart-vue2',
  'quickstart-react',
  'quickstart-svelte',
  '[React Legacy 集成](/zh/guide/ecosystem#react-legacy)',
  '[jQuery 集成](/zh/guide/ecosystem#jquery)',
  '[Core 自定义接入](/zh/guide/ecosystem#core-自定义接入)',
  '[PPT / PPTX 引擎接入](/zh/guide/ecosystem#ppt-与-pptx-引擎接入)',
  'usage',
  'style-isolation',
  '---能力与边界---',
  'formats',
  'format-fidelity',
  'compare',
  'faq',
  '---开发与发布---',
  'development',
  'docker',
  'distribution',
];

await rm(contentRoot, { recursive: true, force: true });
await rm(publicRoot, { recursive: true, force: true });
await mkdir(join(contentRoot, 'guide'), { recursive: true });
await mkdir(publicRoot, { recursive: true });

await copyPublicAssets();
await writeLocalizedPage(join(sourceRoot, 'index.md'), 'index.mdx', 'en');
await writeLocalizedPage(join(sourceRoot, 'zh', 'index.md'), 'index.zh.mdx', 'zh');

for (const page of rootPages) {
  await writeLocalizedPage(join(sourceRoot, `${page}.md`), `${page}.mdx`, 'en');
  await writeLocalizedPage(join(sourceRoot, 'zh', `${page}.md`), `${page}.zh.mdx`, 'zh');
}

for (const entry of await readdir(join(sourceRoot, 'guide'), { withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
  const name = basename(entry.name, '.md');
  await writeLocalizedPage(join(sourceRoot, 'guide', entry.name), `guide/${name}.mdx`, 'en');
  await writeLocalizedPage(join(sourceRoot, 'zh', 'guide', entry.name), `guide/${name}.zh.mdx`, 'zh');
}

await writeJson(join(contentRoot, 'meta.json'), {
  title: 'File Viewer',
  pages: ['guide', '---More---', 'changelog', 'donate'],
});
await writeJson(join(contentRoot, 'meta.zh.json'), {
  title: 'File Viewer',
  pages: ['guide', '---更多信息---', 'changelog', 'donate'],
});
await writeJson(join(contentRoot, 'guide', 'meta.json'), {
  title: 'Documentation',
  defaultOpen: true,
  pagesIndex: 'index',
  pages: guideOrder,
});
await writeJson(join(contentRoot, 'guide', 'meta.zh.json'), {
  title: '文档指南',
  defaultOpen: true,
  pagesIndex: 'index',
  pages: guideOrderZh,
});

async function copyPublicAssets() {
  await cp(join(sourceRoot, 'public'), publicRoot, {
    recursive: true,
    filter(source) {
      const name = basename(source);
      return !['.DS_Store', 'vercel.json', 'llms.txt', 'llms-full.txt'].includes(name);
    },
  });
}

async function writeLocalizedPage(sourcePath, outputPath, locale) {
  const raw = await readFile(sourcePath, 'utf8');
  const title = raw.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? basename(sourcePath, '.md');
  const description = extractDescription(raw, title, locale);
  const content = transformMarkdown(raw, locale);
  const output = `---\ntitle: ${JSON.stringify(title)}\ndescription: ${JSON.stringify(description)}\n---\n\n${content.trim()}\n`;
  const destination = join(contentRoot, outputPath);
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, output);
}

function extractDescription(raw, title, locale) {
  const frontmatterDescription = extractFrontmatterDescription(raw);
  const lead = raw.match(/<p\s+class="doc-lead">([\s\S]*?)<\/p>/i)?.[1];
  const paragraphs = raw
    .replace(/^#\s+.+$/m, '')
    .replace(/```[\s\S]*?```/g, '')
    .split(/\n\s*\n/)
    .map((value) => cleanText(value))
    .filter((value) => value && !value.startsWith('Release history') && !value.startsWith('Start From'));
  const candidate = cleanText(frontmatterDescription ?? lead ?? paragraphs[0] ?? '');
  const fallback = locale === 'zh'
    ? `了解 File Viewer 的${title}配置、能力边界与上线建议。`
    : `Learn ${title} for File Viewer, including configuration, capability boundaries, and production guidance.`;
  return shorten(candidate.length >= 45 ? candidate : fallback, 188, fallback);
}

function extractFrontmatterDescription(raw) {
  const frontmatter = raw.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1];
  const value = frontmatter?.match(/^description:\s*(.+)$/m)?.[1]?.trim();
  if (!value) return undefined;
  if (value.startsWith('"') && value.endsWith('"')) {
    try {
      return JSON.parse(value);
    } catch {
      return value.slice(1, -1);
    }
  }
  return value.replace(/^['"]|['"]$/g, '');
}

function cleanText(value) {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[`*_>#|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function shorten(value, limit, fallback) {
  if (value.length <= limit) return value;
  const clipped = value.slice(0, limit - 1);
  const boundary = Math.max(
    clipped.lastIndexOf('. '),
    clipped.lastIndexOf('。'),
    clipped.lastIndexOf('！'),
    clipped.lastIndexOf('？'),
    clipped.lastIndexOf('! '),
    clipped.lastIndexOf('? '),
  );
  if (boundary > limit * 0.35) return clipped.slice(0, boundary + 1).trim();
  return fallback;
}

function transformMarkdown(raw, locale) {
  const withoutFrontmatter = raw
    .replace(/^---\n[\s\S]*?\n---\n/, '')
    .replace(/<div\s+class="doc-kicker">[\s\S]*?<\/div>\s*/gi, '')
    .replace(/<p\s+class="doc-lead">[\s\S]*?<\/p>\s*/gi, '');
  const lines = withoutFrontmatter.split(/\r?\n/);
  const output = [];
  let inFence = false;
  let removedTitle = false;

  for (let line of lines) {
    if (/^```/.test(line.trim())) {
      inFence = !inFence;
      output.push(line);
      continue;
    }
    if (!inFence) {
      if (!removedTitle && /^#\s+/.test(line)) {
        removedTitle = true;
        continue;
      }
      line = line
        .replace(/\sclass=/g, ' className=')
        .replace(/\sfor=/g, ' htmlFor=')
        .replace(/<br\s*>/gi, '<br />')
        .replace(/<(https?:\/\/[^>]+)>/g, '[$1]($1)')
        .replace(/<!--([\s\S]*?)-->/g, '{/* $1 */}');
      if (locale === 'zh') {
        line = line
          .replace(/\]\(\/(?!zh\/|_|#)(guide\/|changelog|donate)/g, '](/zh/$1')
          .replace(/href="\/(?!zh\/|_|#)(guide\/|changelog|donate)/g, 'href="/zh/$1');
      } else {
        line = line.replace(/\]\(\/en\//g, '](/').replace(/href="\/en\//g, 'href="/');
      }
    }
    output.push(line);
  }
  return output.join('\n');
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

const contentStats = await stat(contentRoot);
if (!contentStats.isDirectory()) throw new Error(`Generated content directory is missing: ${relative(repoRoot, contentRoot)}`);
