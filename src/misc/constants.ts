// The built-in default latency-test URL, used when neither the panel setting
// nor a backend-configured group test URL is available.
export const DEFAULT_LATENCY_TEST_URL = 'https://www.gstatic.com/generate_204';

// Client-side timeout (ms) for a proxy-provider health check. The backend's
// /providers/proxies/{name}/healthcheck ignores query params and blocks until it
// has checked every node in the provider, which can take a long time for large or
// dead providers. This bounds how long the UI waits before it stops the spinner and
// refreshes whatever partial results have landed; the backend keeps checking in the
// background.
export const PROVIDER_HEALTHCHECK_TIMEOUT = 5000;
