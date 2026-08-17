export function Brand({ locale }: { locale: 'en' | 'zh' }) {
  return (
    <span className="fv-brand">
      <img src="/_media/logo.png" width="30" height="30" alt="" aria-hidden="true" />
      <span className="fv-brand__copy">
        <span className="fv-brand__name">File Viewer</span>
        <span className="fv-brand__section">{locale === 'zh' ? '文档' : 'Docs'}</span>
      </span>
    </span>
  );
}
