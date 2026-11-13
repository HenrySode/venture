/**
 * Mock transport. Every service call goes through `mockRequest`, which adds a
 * realistic delay and can be told to fail, so loading and error states can be
 * reviewed without a backend. Swap this for a real `fetch` client later.
 */

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    /** Stable code screens can map to a translated message. */
    readonly code: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type DevNetwork = {
  /** Multiplies the simulated latency. 1 = normal (~600ms), 4 = slow 3G feel. */
  latency: number;
  /** When true every request rejects with a network error. */
  failAll: boolean;
  /** Shows the device as offline: sales still save and wait in a queue (mock). */
  offline: boolean;
};

/** Replaced (never mutated) on change, so it works as a useSyncExternalStore snapshot. */
let network: Readonly<DevNetwork> = { latency: 1, failAll: false, offline: false };
const listeners = new Set<() => void>();

export const devNetwork = {
  get: (): Readonly<DevNetwork> => network,
  set(patch: Partial<DevNetwork>) {
    network = { ...network, ...patch };
    listeners.forEach((l) => l());
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function mockRequest<T>(handler: () => T, baseDelayMs = 600): Promise<T> {
  const jitter = Math.random() * 250;
  await wait((baseDelayMs + jitter) * network.latency);
  if (network.failAll) {
    throw new ApiError('Network request failed', 0, 'network');
  }
  return handler();
}
