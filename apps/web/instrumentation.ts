/**
 * Next.js Instrumentation for Sentry
 *
 * This file is automatically loaded by Next.js 13+ to instrument the application.
 * It runs before any other code, ensuring Sentry is initialized early.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Server-side instrumentation
    await import('./sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    // Edge runtime instrumentation
    await import('./sentry.edge.config');
  }
}

export const onRequestError = async (
  err: Error,
  request: {
    path: string;
    method: string;
    headers: Headers;
  },
  context: {
    routerKind: 'Pages Router' | 'App Router';
    routePath: string;
    routeType: 'render' | 'route' | 'action' | 'middleware';
  }
) => {
  // This function is called for unhandled errors in production
  // Sentry will automatically capture these, but you can add custom logic here

  console.error('Unhandled error:', {
    error: err,
    path: request.path,
    method: request.method,
    context,
  });
};
