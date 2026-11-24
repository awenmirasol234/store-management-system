import { ConflictError, NotFoundError, UnauthorizedError, ValidationError } from "../shared/errors.js";
import {
  DEFAULT_SESSION_DURATION_MS,
  ROLES,
  generateSalt,
  generateSessionToken,
  hashPin,
  sanitizeUser,
  validateFullName,
  validatePin,
  validateRole,
  validateUsername,
  verifyPin
} from "./domain.js";
import { normalizeBoolean } from "../shared/validation.js";

export function createGetAuthStatusUseCase(dependencies) {
  const userRepository = dependencies.userRepository;

  return async function getAuthStatus() {
    const count = await userRepository.countUsers();
    return {
      is_setup_required: count === 0,
      user_count: count
    };
  };
}

export function createSetupInitialOwnerUseCase(dependencies) {
  const userRepository = dependencies.userRepository;
  const sessionRepository = dependencies.sessionRepository;
  const idGenerator = dependencies.idGenerator;
  const clock = dependencies.clock;

  return async function setupInitialOwner(input) {
    const createOwner = async function createOwner() {
      if (!input) {
        throw new ValidationError("Input is required");
      }

      const count = await userRepository.countUsers();
      if (count > 0) {
        throw new ConflictError("Initial setup has already been completed");
      }

      const validUsername = validateUsername(input.username);
      const validFullName = validateFullName(input.full_name);
      const validPin = validatePin(input.pin);

      const salt = generateSalt();
      const pinHash = hashPin(validPin, salt);
      const userId = idGenerator.nextId();
      const nowIso = clock.nowIso();

      const user = {
        user_id: userId,
        username: validUsername,
        full_name: validFullName,
        role: ROLES.OWNER,
        pin_hash: pinHash,
        pin_salt: salt,
        is_active: 1,
        created_at: nowIso,
        updated_at: nowIso
      };

      await userRepository.createUser(user);

      const token = generateSessionToken();
      const sessionId = idGenerator.nextId();
      const expiresAt = new Date(Date.now() + DEFAULT_SESSION_DURATION_MS).toISOString();

      const session = {
        session_id: sessionId,
        user_id: userId,
        token: token,
        expires_at: expiresAt,
        created_at: nowIso
      };

      await sessionRepository.createSession(session);

      return {
        user: sanitizeUser(user),
        token: token,
        expires_at: expiresAt
      };
    };

    if (dependencies.unitOfWork) {
      return dependencies.unitOfWork.run(createOwner);
    }
    return createOwner();
  };
}

export function createLoginUseCase(dependencies) {
  const userRepository = dependencies.userRepository;
  const sessionRepository = dependencies.sessionRepository;
  const idGenerator = dependencies.idGenerator;
  const clock = dependencies.clock;
  const rateLimiter = dependencies.rateLimiter;

  return async function login(input) {
    if (!input) {
      throw new ValidationError("Input is required");
    }

    const validUsername = validateUsername(input.username);
    const validPin = validatePin(input.pin);

    const clientKey = input.clientKey || validUsername;
    if (rateLimiter) {
      rateLimiter.check(clientKey);
    }

    const user = await userRepository.findByUsername(validUsername);
    let isMatch = false;

    if (user && user.is_active) {
      isMatch = verifyPin(validPin, user.pin_salt, user.pin_hash);
    }

    if (!isMatch) {
      if (rateLimiter) {
        rateLimiter.recordFailure(clientKey);
      }
      throw new UnauthorizedError("Invalid username or PIN");
    }

    if (rateLimiter) {
      rateLimiter.reset(clientKey);
    }

    const token = generateSessionToken();
    const sessionId = idGenerator.nextId();
    const nowIso = clock.nowIso();
    const expiresAt = new Date(Date.now() + DEFAULT_SESSION_DURATION_MS).toISOString();

    const session = {
      session_id: sessionId,
      user_id: user.user_id,
      token: token,
      expires_at: expiresAt,
      created_at: nowIso
    };

    await sessionRepository.createSession(session);

    return {
      user: sanitizeUser(user),
      token: token,
      expires_at: expiresAt
    };
  };
}

export function createLogoutUseCase(dependencies) {
  const sessionRepository = dependencies.sessionRepository;

  return async function logout(input) {
    if (input && input.token) {
      await sessionRepository.deleteByToken(input.token);
    }
    return { success: true };
  };
}

export function createGetCurrentUserUseCase(dependencies) {
  const userRepository = dependencies.userRepository;
  const sessionRepository = dependencies.sessionRepository;
  const clock = dependencies.clock;

  return async function getCurrentUser(input) {
    if (!input || !input.token) {
      return null;
    }

    const session = await sessionRepository.findByToken(input.token);
    if (!session) {
      return null;
    }

    const nowIso = clock.nowIso();
    if (session.expires_at <= nowIso) {
      await sessionRepository.deleteByToken(input.token);
      return null;
    }

    const user = await userRepository.findById(session.user_id);
    if (!user || !user.is_active) {
      return null;
    }

    return sanitizeUser(user);
  };
}

export function createCreateUserUseCase(dependencies) {
  const userRepository = dependencies.userRepository;
  const idGenerator = dependencies.idGenerator;
  const clock = dependencies.clock;

  return async function createUser(input) {
    if (!input) {
      throw new ValidationError("Input is required");
    }

    const validUsername = validateUsername(input.username);
    const validFullName = validateFullName(input.full_name);
    const validRole = validateRole(input.role);
    const validPin = validatePin(input.pin);

    const existing = await userRepository.findByUsername(validUsername);
    if (existing) {
      throw new ConflictError("Username already exists");
    }

    const salt = generateSalt();
    const pinHash = hashPin(validPin, salt);
    const userId = idGenerator.nextId();
    const nowIso = clock.nowIso();

    const user = {
      user_id: userId,
      username: validUsername,
      full_name: validFullName,
      role: validRole,
      pin_hash: pinHash,
      pin_salt: salt,
      is_active: 1,
      created_at: nowIso,
      updated_at: nowIso
    };

    await userRepository.createUser(user);
    return sanitizeUser(user);
  };
}

export function createUpdateUserUseCase(dependencies) {
  const userRepository = dependencies.userRepository;
  const sessionRepository = dependencies.sessionRepository;
  const clock = dependencies.clock;

  return async function updateUser(userId, input) {
    if (!userId || typeof userId !== "string") {
      throw new ValidationError("User ID is required");
    }
    if (!input) {
      throw new ValidationError("Input is required");
    }

    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    let fullName = user.full_name;
    if (input.full_name !== undefined) {
      fullName = validateFullName(input.full_name);
    }

    let role = user.role;
    if (input.role !== undefined) {
      role = validateRole(input.role);
    }

    let isActive = user.is_active;
    if (input.is_active !== undefined) {
      isActive = normalizeBoolean(input.is_active, user.is_active, "is_active");
    }

    let pinHash = user.pin_hash;
    let pinSalt = user.pin_salt;
    if (input.pin !== undefined && input.pin !== "") {
      const validPin = validatePin(input.pin);
      pinSalt = generateSalt();
      pinHash = hashPin(validPin, pinSalt);
    }

    if (!isActive) {
      await sessionRepository.deleteByUserId(userId);
    }

    const nowIso = clock.nowIso();
    const updated = await userRepository.updateUser(userId, {
      full_name: fullName,
      role: role,
      pin_hash: pinHash,
      pin_salt: pinSalt,
      is_active: isActive,
      updated_at: nowIso
    });

    return sanitizeUser(updated);
  };
}

export function createListUsersUseCase(dependencies) {
  const userRepository = dependencies.userRepository;

  return async function listUsers() {
    const users = await userRepository.listUsers();
    const results = [];
    for (let index = 0; index < users.length; index = index + 1) {
      results.push(sanitizeUser(users[index]));
    }
    return results;
  };
}

export function createChangePinUseCase(dependencies) {
  const userRepository = dependencies.userRepository;
  const clock = dependencies.clock;

  return async function changePin(input) {
    if (!input) {
      throw new ValidationError("Input is required");
    }

    const userId = input.userId;
    if (!userId || typeof userId !== "string") {
      throw new ValidationError("User ID is required");
    }

    const currentPin = validatePin(input.current_pin);
    const newPin = validatePin(input.new_pin);

    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    if (!verifyPin(currentPin, user.pin_salt, user.pin_hash)) {
      throw new UnauthorizedError("Current PIN is incorrect");
    }

    const newSalt = generateSalt();
    const newHash = hashPin(newPin, newSalt);
    const nowIso = clock.nowIso();

    await userRepository.updateUser(userId, {
      full_name: user.full_name,
      role: user.role,
      pin_hash: newHash,
      pin_salt: newSalt,
      is_active: user.is_active,
      updated_at: nowIso
    });

    return { success: true };
  };
}
