export const metadata = { robots: { index: false, follow: false } };

export default function NotFound() {
  return (
    <main className="fv-not-found">
      <span>404</span>
      <h1>这篇文档已移动</h1>
      <p>请搜索文档，或返回快速开始。</p>
      <a href="/zh/guide/quickstart">打开快速开始</a>
    </main>
  );
}
