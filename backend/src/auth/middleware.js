import { ForbiddenError, TooManyRequestsError, UnauthorizedError } from "../shared/errors.js";

export function createInMemoryRateLimiter(options) {
  let config = options;
  if (!config) {
    config = {};
  }
  const maxAttempts = config.maxAttempts || 5;
  const windowMs = config.windowMs || 15 * 60 * 1000;
  const maxEntries = config.maxEntries || 10000;
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
      const now = Date.now();
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
      const now = Date.now();
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

export function createAuthMiddleware(authUseCases) {
  return {
    async authenticate(request, response, next) {
      try {
        const authHeader = request.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
          const token = authHeader.slice(7).trim();
          if (token) {
            const user = await authUseCases.getCurrentUser({ token: token });
            if (user) {
              request.user = user;
              request.token = token;
            }
          }
        }
        next();
      } catch (error) {
        next(error);
      }
    },

    requireAuth(request, response, next) {
      if (!request.user) {
        throw new UnauthorizedError("Authentication required");
      }
      next();
    },

    requireRole(allowedRoles) {
      return function checkRole(request, response, next) {
        if (!request.user) {
          throw new UnauthorizedError("Authentication required");
        }
        if (!allowedRoles.includes(request.user.role)) {
          throw new ForbiddenError("Insufficient permissions");
        }
        next();
      };
    }
  };
}
