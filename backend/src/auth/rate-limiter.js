import { TooManyRequestsError } from "../shared/errors.js";

// shortcut: in-memory Map rate limiter resets on process restart, upgrade to persistent store or Redis if multi-process or persistent rate limiting is needed.
export function createInMemoryRateLimiter(options) {
  let config = options;
  if (!config) {
    config = {};
  }
  const maxAttempts = config.maxAttempts || 5;
  const windowMs = config.windowMs || 15 * 60 * 1000;
  const maxEntries = config.maxEntries || 10000;
  const nowMilliseconds = config.nowMilliseconds || Date.now;
  const attempts = new Map();

  function removeExpired(now) {
    for (const [key, record] of attempts.entries()) {
      if (now >= record.resetAt) {
        attempts.delete(key);
      }
    }
  }

  function makeRoom() {
    while (attempts.size >= maxEntries) {
      const firstKey = attempts.keys().next().value;
      if (firstKey === undefined) {
        return;
      }
      attempts.delete(firstKey);
    }
  }

  return {
    check(key) {
      const now = nowMilliseconds();
      removeExpired(now);
      const record = attempts.get(key);
      if (!record) {
        return;
      }
      if (record.count >= maxAttempts) {
        const remainingSec = Math.ceil((record.resetAt - now) / 1000);
        throw new TooManyRequestsError(
          "Too many failed login attempts. Please try again in " + String(remainingSec) + " seconds."
        );
      }
    },

    recordFailure(key) {
      const now = nowMilliseconds();
      removeExpired(now);
      const record = attempts.get(key);
      if (!record || now >= record.resetAt) {
        if (!record) {
          makeRoom();
        }
        attempts.set(key, {
          count: 1,
          resetAt: now + windowMs
        });
        return;
      }
      record.count = record.count + 1;
      attempts.set(key, record);
    },

    reset(key) {
      attempts.delete(key);
    }
  };
}
