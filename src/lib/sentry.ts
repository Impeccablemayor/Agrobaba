import * as Sentry from '@sentry/react';

const DSN = import.meta.env.VITE_SENTRY_DSN;

export function initSentry() {
  if (!DSN) {
    // Sentry is inactive in environments without a configured DSN
    return;
  }

  Sentry.init({
    dsn: DSN,
    environment: import.meta.env.MODE,
    release: 'agrobaba-frontend@1.0.0',
    integrations: [
      Sentry.browserTracingIntegration(),
    ],
    // Tracing sample rate: 10% in production, 100% in development
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    // Filter out common noise
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      'Network request failed',
    ],
  });
}

/**
 * Manually logs an error with custom metadata to Sentry (if enabled).
 */
export function captureFrontendError(error: unknown, context?: Record<string, unknown>) {
  if (!DSN) {
    console.error('[Error Tracker - Inactive]', error, context);
    return;
  }

  Sentry.captureException(error, {
    extra: context,
  });
}

export { Sentry };

