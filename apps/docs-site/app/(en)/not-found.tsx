export const metadata = { robots: { index: false, follow: false } };

export default function NotFound() {
  return (
    <main className="fv-not-found">
      <span>404</span>
      <h1>That document moved.</h1>
      <p>Search the documentation or return to the quickstart.</p>
      <a href="/guide/quickstart">Open quickstart</a>
    </main>
  );
}
