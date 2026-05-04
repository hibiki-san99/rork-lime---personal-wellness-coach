const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 2000;
const WAKE_TIMEOUT_MS = 10000;

interface ResilientFetchOptions extends RequestInit {
  maxRetries?: number;
  retryDelayMs?: number;
  onRetry?: (attempt: number, maxRetries: number) => void;
  skipWake?: boolean;
}

let lastWakeTime = 0;
let wakePromise: Promise<boolean> | null = null;

const getBaseUrl = () => process.env.EXPO_PUBLIC_RORK_API_BASE_URL || '';

export async function wakeBackend(baseUrl?: string): Promise<boolean> {
  const url = baseUrl || getBaseUrl();
  if (!url) {
    console.log('[WakeBackend] No backend URL configured');
    return false;
  }

  const now = Date.now();
  if (now - lastWakeTime < 30000) {
    console.log('[WakeBackend] Recently woken, skipping');
    return true;
  }

  if (wakePromise) {
    console.log('[WakeBackend] Wake already in progress, waiting...');
    return wakePromise;
  }

  wakePromise = (async () => {
    for (let i = 0; i < 4; i++) {
      try {
        console.log(`[WakeBackend] Ping attempt ${i + 1}/4: ${url}/api/health`);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), WAKE_TIMEOUT_MS);
        const res = await fetch(`${url}/api/health`, {
          method: 'GET',
          signal: controller.signal,
        });
        clearTimeout(timeout);
        const data = await res.json().catch(() => null);
        console.log(`[WakeBackend] Ping ${i + 1} response: status=${res.status} body=${JSON.stringify(data)}`);
        if (res.ok) {
          lastWakeTime = Date.now();
          return true;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.log(`[WakeBackend] Ping ${i + 1} failed: ${msg}`);
      }
      if (i < 3) {
        const delay = 2000 * (i + 1);
        console.log(`[WakeBackend] Waiting ${delay}ms before next wake attempt...`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
    return false;
  })();

  try {
    return await wakePromise;
  } finally {
    wakePromise = null;
  }
}

export async function resilientFetch(
  url: string,
  options: ResilientFetchOptions = {}
): Promise<Response> {
  const {
    maxRetries = MAX_RETRIES,
    retryDelayMs = RETRY_DELAY_MS,
    onRetry,
    skipWake,
    ...fetchOptions
  } = options;

  if (!skipWake) {
    const timeSinceWake = Date.now() - lastWakeTime;
    if (timeSinceWake > 60000) {
      console.log('[ResilientFetch] Backend may be cold, waking first...');
      await wakeBackend();
    }
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[ResilientFetch] Attempt ${attempt + 1}/${maxRetries + 1}: ${url}`);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });
      clearTimeout(timeout);
      console.log(`[ResilientFetch] Attempt ${attempt + 1} succeeded: status=${response.status}`);
      lastWakeTime = Date.now();
      return response;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.log(`[ResilientFetch] Attempt ${attempt + 1} failed: ${lastError.message}`);

      if (attempt < maxRetries) {
        if (attempt === 1) {
          console.log('[ResilientFetch] Multiple failures, trying to wake backend...');
          await wakeBackend();
        }
        onRetry?.(attempt + 1, maxRetries);
        const delay = retryDelayMs * (attempt + 1);
        console.log(`[ResilientFetch] Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(
    'Unable to connect. Please check your internet connection and try again.'
  );
}
