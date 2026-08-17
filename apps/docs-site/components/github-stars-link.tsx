import { IconBrandGithub, IconStarFilled } from '@tabler/icons-react';
import { site } from '@/lib/shared';

export function GitHubStarsLink() {
  return (
    <a
      className="fv-github-stars"
      href={site.githubUrl}
      target="_blank"
      rel="noreferrer"
      aria-label="File Viewer on GitHub, more than 2,000 stars"
    >
      <IconBrandGithub size={18} stroke={1.9} aria-hidden="true" />
      <span>GitHub</span>
      <span className="fv-github-stars__count">
        <IconStarFilled size={12} aria-hidden="true" />
        2K+
      </span>
    </a>
  );
}
