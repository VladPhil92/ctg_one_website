import { getDeploymentMetadata } from './deployment';

type LogLevel = 'info' | 'warn' | 'error';

export type LogContext = Record<string, unknown>;

const SENSITIVE_KEYS = [
  'password',
  'token',
  'authorization',
  'cookie',
  'secret',
  'apikey',
  'api_key',
  'service_role',
  'access_token',
  'refresh_token',
];

function shouldRedact(key: string): boolean {
  const normalized = key.toLowerCase();
  return SENSITIVE_KEYS.some((candidate) => normalized.includes(candidate));
}

function redactValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactValue);
  if (!value || typeof value !== 'object') return value;
  return redactContext(value as LogContext);
}

function redactContext(context: LogContext): LogContext {
  return Object.fromEntries(
    Object.entries(context).map(([key, value]) => [
      key,
      shouldRedact(key) ? '[REDACTED]' : redactValue(value),
    ])
  );
}

function emit(level: LogLevel, event: string, context: LogContext = {}) {
  const deployment = getDeploymentMetadata();
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    event,
    service: 'ctg-one-web',
    environment: process.env.NODE_ENV ?? 'unknown',
    deployment_provider: deployment.provider,
    deployment_commit: deployment.commit,
    deployment_branch: deployment.branch,
    deployment_service: deployment.service,
    expected_database_migration: deployment.expectedDatabaseMigration,
    ...redactContext(context),
  };

  const line = JSON.stringify(payload);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.info(line);
}

export const logger = {
  info: (event: string, context?: LogContext) => emit('info', event, context),
  warn: (event: string, context?: LogContext) => emit('warn', event, context),
  error: (event: string, context?: LogContext) => emit('error', event, context),
};
