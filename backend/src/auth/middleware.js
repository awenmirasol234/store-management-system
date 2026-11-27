import { ForbiddenError, UnauthorizedError } from "../shared/errors.js";

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
