import { defineDocs } from 'fumadocs-mdx/macro';
import { loader } from 'fumadocs-core/source';
import { metaSchema, pageSchema } from 'fumadocs-core/source/schema';
import { i18n } from './i18n';

const docs = defineDocs({
  dir: 'content/docs',
  docs: {
    schema: pageSchema,
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
  meta: {
    schema: metaSchema,
  },
});

export const source = loader({
  baseUrl: '/',
  i18n,
  source: docs.toFumadocsSource(),
});

export function getPageMarkdownUrl(page: (typeof source)['$inferPage']) {
  const path = [page.locale === 'zh' ? 'zh' : undefined, ...page.slugs, 'content.md'].filter(Boolean);
  return {
    segments: path,
    url: `/llms.mdx/${path.join('/')}`,
  };
}

export async function getLLMText(page: (typeof source)['$inferPage']) {
  const processed = await page.data.getText('processed');
  return `# ${page.data.title} (${page.url})\n\n${processed}`;
}
