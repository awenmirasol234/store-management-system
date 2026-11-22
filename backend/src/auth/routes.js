import express from "express";
import { ROLES } from "./domain.js";
import { ForbiddenError, UnauthorizedError } from "../shared/errors.js";

export function createAuthRouter(authUseCases) {
  const router = express.Router();

  router.get("/status", async function getStatus(request, response) {
    const status = await authUseCases.getAuthStatus();
    response.json({ data: status });
  });

  router.post("/setup", async function setup(request, response) {
    const result = await authUseCases.setupInitialOwner(request.body);
    response.status(201).json({ data: result });
  });

  router.post("/login", async function login(request, response) {
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
  });

  router.post("/logout", async function logout(request, response) {
    await authUseCases.logout({ token: request.token });
    response.json({ data: { success: true } });
  });

  router.get("/me", function getMe(request, response) {
    if (!request.user) {
      throw new UnauthorizedError("Authentication required");
    }
    response.json({ data: request.user });
  });

  router.post("/change-pin", async function changePin(request, response) {
    if (!request.user) {
      throw new UnauthorizedError("Authentication required");
    }
    const payload = Object.assign({}, request.body, { userId: request.user.user_id });
    const result = await authUseCases.changePin(payload);
    response.json({ data: result });
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

  router.get("/", async function listUsers(request, response) {
    const users = await authUseCases.listUsers();
    response.json({ data: users });
  });

  router.post("/", async function createUser(request, response) {
    const user = await authUseCases.createUser(request.body);
    response.status(201).json({ data: user });
  });

  router.patch("/:userId", async function updateUser(request, response) {
    const user = await authUseCases.updateUser(request.params.userId, request.body);
    response.json({ data: user });
  });

  return router;
}
