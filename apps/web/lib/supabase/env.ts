const DEFAULT_SUPABASE_TIMEOUT_MS = 5000;
const DEFAULT_AUTH_TIMEOUT_MS = 6000;

export type SupabasePublicEnv = {
  anonKey: string;
  url: string;
};

export function getSupabasePublicEnv(): SupabasePublicEnv {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    const missing = [
      ["NEXT_PUBLIC_SUPABASE_URL", url],
      ["NEXT_PUBLIC_SUPABASE_ANON_KEY", anonKey],
    ]
      .filter(([, value]) => !value)
      .map(([name]) => name);

    throw new Error(`Missing required Supabase environment variables: ${missing.join(", ")}`);
  }

  return { anonKey, url };
}

export function hasSupabasePublicEnv() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function getSupabaseServiceRoleKey() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error("Missing required Supabase environment variable: SUPABASE_SERVICE_ROLE_KEY");
  }

  return serviceRoleKey;
}

export async function withSupabaseTimeout<T>(
  operation: (signal: AbortSignal) => PromiseLike<T>,
  timeoutMs = DEFAULT_AUTH_TIMEOUT_MS,
): Promise<T> {
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      const error = new Error(`Supabase operation timed out after ${timeoutMs}ms`);
      controller.abort(error);
      reject(error);
    }, timeoutMs);
  });

  try {
    // Auth token refresh can retry for 30 seconds, beyond a single fetch timeout.
    return await Promise.race([operation(controller.signal), deadline]);
  } finally {
    clearTimeout(timeout);
  }
}

export function createTimeoutFetch(
  timeoutMs = DEFAULT_SUPABASE_TIMEOUT_MS,
  operationSignal?: AbortSignal,
): typeof fetch {
  return async (input, init) => {
    const controller = new AbortController();
    const callerSignal = init?.signal ?? (input instanceof Request ? input.signal : undefined);
    const signals = [callerSignal, operationSignal].filter(
      (signal): signal is AbortSignal => Boolean(signal),
    );
    const abort = () => {
      const signal = signals.find((signal) => signal.aborted);
      if (signal) controller.abort(signal.reason);
    };
    signals.forEach((signal) => signal.addEventListener("abort", abort, { once: true }));
    abort();

    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);

    try {
      const response = await fetch(input, {
        ...init,
        signal: controller.signal,
      });

      // fetch resolves at the headers; keep the deadline until the body arrives.
      // Read a clone so callers retain the original response and its metadata.
      await response.clone().arrayBuffer();
      return response;
    } catch (error) {
      if (timedOut) {
        throw new Error(`Supabase request timed out after ${timeoutMs}ms`);
      }

      throw error;
    } finally {
      clearTimeout(timeout);
      signals.forEach((signal) => signal.removeEventListener("abort", abort));
    }
  };
}
