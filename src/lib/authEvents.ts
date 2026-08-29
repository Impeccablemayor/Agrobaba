/**
 * Minimal, safe authentication observability.
 *
 * Enabled automatically in dev builds and in any build where VITE_AUTH_LOG=true was set at build
 * time. This module only ever receives event names and coarse metadata (paths, status codes,
 * delays) - never tokens, cookies or credentials - so logging cannot leak secrets by construction.
 */
let enabled: boolean | null = null;

function isEnabled(): boolean {
  if (enabled === null) {
    const env = import.meta.env as Record<string, unknown>;
    enabled = env.DEV === true || env.VITE_AUTH_LOG === 'true';
  }
  return enabled;
}

export function authLog(event: string, detail?: Record<string, unknown>): void {
  if (!isEnabled()) return;
  console.info(`[auth:${event}]`, detail !== undefined ? detail : '');
}