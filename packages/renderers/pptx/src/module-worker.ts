/**
 * A same-origin module entry can import an explicitly configured cross-origin
 * Worker. Keeping the remote module's URL intact also keeps its relative imports
 * and import.meta.url-based assets intact. Normal CORS and CSP still apply.
 */
export const createPptxUrlWorker = (url: string | URL, type: WorkerType = 'module'): Worker => {
  let remote: URL | undefined;
  if (type === 'module' && typeof location !== 'undefined') {
    const resolved = new URL(String(url), location.href);
    if (/^https?:$/.test(resolved.protocol) && resolved.origin !== location.origin) {
      remote = resolved;
    }
  }
  if (!remote) return new Worker(url, { type });

  const entry = URL.createObjectURL(new Blob([
    `import ${JSON.stringify(remote.href)};\n`,
  ], { type: 'text/javascript' }));
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    URL.revokeObjectURL(entry);
  };
  try {
    const worker = new Worker(entry, { type: 'module' });
    const terminate = worker.terminate.bind(worker);
    worker.terminate = () => {
      worker.removeEventListener('error', release);
      release();
      terminate();
    };
    worker.addEventListener('error', release, { once: true });
    return worker;
  } catch (error) {
    release();
    throw error;
  }
};
