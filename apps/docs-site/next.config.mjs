import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX({ agentRules: false });
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

function resolveDeploymentId() {
  const configuredId = process.env.DOCS_DEPLOYMENT_ID || process.env.CF_PAGES_COMMIT_SHA;
  if (configuredId) return configuredId.trim();

  try {
    return execFileSync('git', ['rev-parse', '--short=12', 'HEAD'], {
      cwd: repositoryRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return process.env.npm_package_version || 'local';
  }
}

/** @type {import('next').NextConfig} */
const config = {
  deploymentId: resolveDeploymentId(),
  supportsImmutableAssets: false,
  output: 'export',
  experimental: {
    globalNotFound: true,
  },
  reactStrictMode: true,
  trailingSlash: false,
  skipTrailingSlashRedirect: true,
  poweredByHeader: false,
};

export default withMDX(config);
