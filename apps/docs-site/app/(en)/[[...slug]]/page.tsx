import { FileViewerDocsPage, generateDocsMetadata, generateDocsStaticParams } from '@/components/docs-page';

export default async function EnglishPage({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  return <FileViewerDocsPage locale="en" slug={slug} />;
}

export function generateStaticParams() {
  return generateDocsStaticParams('en');
}

export async function generateMetadata({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  return generateDocsMetadata({ locale: 'en', slug });
}
