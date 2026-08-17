import { EXPECTED_DATABASE_MIGRATION } from './schema-version';

export type DeploymentMetadata = {
  provider: 'render' | 'unknown';
  commit: string | null;
  shortCommit: string | null;
  branch: string | null;
  repository: string | null;
  service: string | null;
  expectedDatabaseMigration: string;
};

export function getDeploymentMetadata(): DeploymentMetadata {
  const commit = process.env.RENDER_GIT_COMMIT ?? null;
  return {
    provider: process.env.RENDER === 'true' ? 'render' : 'unknown',
    commit,
    shortCommit: commit?.slice(0, 12) ?? null,
    branch: process.env.RENDER_GIT_BRANCH ?? null,
    repository: process.env.RENDER_GIT_REPO_SLUG ?? null,
    service: process.env.RENDER_SERVICE_NAME ?? null,
    expectedDatabaseMigration: EXPECTED_DATABASE_MIGRATION,
  };
}
