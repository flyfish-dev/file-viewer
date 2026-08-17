'use client';

import { useEffect, useState } from 'react';

export function ReadingProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const update = () => {
      const article = document.querySelector('[data-docs-body]');
      if (!(article instanceof HTMLElement)) return;
      const start = article.offsetTop;
      const distance = Math.max(1, article.offsetHeight - window.innerHeight * 0.58);
      setProgress(Math.min(1, Math.max(0, (window.scrollY - start + 120) / distance)));
    };

    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return (
    <span className="fv-reading-progress" aria-hidden="true">
      <span style={{ transform: `scaleX(${progress})` }} />
    </span>
  );
}
