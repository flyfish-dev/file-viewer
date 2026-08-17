import { FileViewerDocsPage, generateDocsMetadata, generateDocsStaticParams } from '@/components/docs-page';

export default async function ChinesePage({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  return <FileViewerDocsPage locale="zh" slug={slug} />;
}

export function generateStaticParams() {
  return generateDocsStaticParams('zh');
}

export async function generateMetadata({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  return generateDocsMetadata({ locale: 'zh', slug });
}
