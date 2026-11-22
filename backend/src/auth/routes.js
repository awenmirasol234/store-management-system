import express from "express";
import { ROLES } from "./domain.js";
import { ForbiddenError, UnauthorizedError } from "../shared/errors.js";

export function createAuthRouter(authUseCases) {
  const router = express.Router();

  router.get("/status", async function getStatus(request, response, next) {
    try {
      const status = await authUseCases.getAuthStatus();
      response.json({ data: status });
    } catch (error) {
      next(error);
    }
  });

  router.post("/setup", async function setup(request, response, next) {
    try {
      const result = await authUseCases.setupInitialOwner(request.body);
      response.status(201).json({ data: result });
    } catch (error) {
      next(error);
    }
  });

  router.post("/login", async function login(request, response, next) {
    try {
      let ip = "local";
      if (request.ip) {
        ip = request.ip;
      } else if (request.socket && request.socket.remoteAddress) {
        ip = request.socket.remoteAddress;
      }

      let username = "";
      if (request.body && request.body.username) {
        username = request.body.username;
      }

      const clientKey = ip + ":" + String(username);
      const payload = Object.assign({}, request.body, { clientKey: clientKey });
      const result = await authUseCases.login(payload);
      response.json({ data: result });
    } catch (error) {
      next(error);
    }
  });

  router.post("/logout", async function logout(request, response, next) {
    try {
      await authUseCases.logout({ token: request.token });
      response.json({ data: { success: true } });
    } catch (error) {
      next(error);
    }
  });

  router.get("/me", function getMe(request, response, next) {
    try {
      if (!request.user) {
        throw new UnauthorizedError("Authentication required");
      }
      response.json({ data: request.user });
    } catch (error) {
      next(error);
    }
  });

  router.post("/change-pin", async function changePin(request, response, next) {
    try {
      if (!request.user) {
        throw new UnauthorizedError("Authentication required");
      }
      const payload = Object.assign({}, request.body, { userId: request.user.user_id });
      const result = await authUseCases.changePin(payload);
      response.json({ data: result });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

export function createUsersRouter(dependencies) {
  const router = express.Router();
  const authUseCases = dependencies.useCases;
  const authMiddleware = dependencies.authMiddleware;
  const enforceAuth = dependencies.enforceAuth;

  if (enforceAuth) {
    router.use(authMiddleware.requireRole([ROLES.OWNER]));
  } else {
    router.use(function optionalCheck(request, response, next) {
      if (request.user && request.user.role !== ROLES.OWNER) {
        throw new ForbiddenError("Only store owners can manage users");
      }
      next();
    });
  }

  router.get("/", async function listUsers(request, response, next) {
    try {
      const users = await authUseCases.listUsers();
      response.json({ data: users });
    } catch (error) {
      next(error);
    }
  });

  router.post("/", async function createUser(request, response, next) {
    try {
      const user = await authUseCases.createUser(request.body);
      response.status(201).json({ data: user });
    } catch (error) {
      next(error);
    }
  });

  router.patch("/:userId", async function updateUser(request, response, next) {
    try {
      const user = await authUseCases.updateUser(request.params.userId, request.body);
      response.json({ data: user });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
