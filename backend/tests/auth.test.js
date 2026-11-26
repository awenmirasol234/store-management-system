import { describe, expect, it } from "vitest";
import { createSqliteUnitOfWork, openSqliteDatabase } from "../src/db/sqlite.js";
import { createDefaultIdGenerator, createSystemClock } from "../src/shared/ports.js";
import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
  ValidationError
} from "../src/shared/errors.js";
import {
  ROLES,
  generateSalt,
  hashPin,
  sanitizeUser,
  validateFullName,
  validatePin,
  validateRole,
  validateUsername,
  verifyPin
} from "../src/auth/domain.js";
import {
  createSqliteSessionRepository,
  createSqliteUserRepository
} from "../src/auth/sqlite-repo.js";
import { createInMemoryRateLimiter } from "../src/auth/middleware.js";
import {
  createChangePinUseCase,
  createCreateUserUseCase,
  createGetAuthStatusUseCase,
  createGetCurrentUserUseCase,
  createListUsersUseCase,
  createLoginUseCase,
  createLogoutUseCase,
  createSetupInitialOwnerUseCase,
  createUpdateUserUseCase
} from "../src/auth/use-cases.js";

describe("Auth Domain", function () {
  it("bounds failed-login rate limiter records", function () {
    const rateLimiter = createInMemoryRateLimiter({
      maxAttempts: 1,
      maxEntries: 1,
      windowMs: 60 * 60 * 1000
    });

    rateLimiter.recordFailure("first");
    rateLimiter.recordFailure("second");

    expect(function () {
      rateLimiter.check("first");
    }).not.toThrow();
    expect(function () {
      rateLimiter.check("second");
    }).toThrow();
  });

  it("hashes and verifies PIN using scrypt with timing-safe comparison", function () {
    const salt = generateSalt();
    const pin = "1234";
    const hash = hashPin(pin, salt);

    expect(typeof hash).toBe("string");
    expect(hash.length).toBe(128); // 64 bytes hex
    expect(verifyPin("1234", salt, hash)).toBe(true);
    expect(verifyPin("0000", salt, hash)).toBe(false);
    expect(verifyPin("12345", salt, hash)).toBe(false);
    expect(verifyPin("", salt, hash)).toBe(false);
  });

  it("validates username rules", function () {
    expect(validateUsername("admin_1")).toBe("admin_1");
    expect(validateUsername("  cashier-01  ")).toBe("cashier-01");
    expect(function () {
      validateUsername("ab");
    }).toThrow(ValidationError);
    expect(function () {
      validateUsername("user with spaces");
    }).toThrow(ValidationError);
  });

  it("validates role rules", function () {
    expect(validateRole("owner")).toBe("OWNER");
    expect(validateRole("CASHIER")).toBe("CASHIER");
    expect(function () {
      validateRole("SUPERADMIN");
    }).toThrow(ValidationError);
  });

  it("validates PIN length rules", function () {
    expect(validatePin("1234")).toBe("1234");
    expect(validatePin("12345678")).toBe("12345678");
    expect(function () {
      validatePin("123");
    }).toThrow(ValidationError);
    expect(function () {
      validatePin("123456789");
    }).toThrow(ValidationError);
  });

  it("sanitizes user entities by stripping credential hashes", function () {
    const raw = {
      user_id: "u1",
      username: "owner",
      full_name: "Store Owner",
      role: "OWNER",
      pin_hash: "secret_hash",
      pin_salt: "secret_salt",
      is_active: 1,
      created_at: "2026-11-20T00:00:00.000Z",
      updated_at: "2026-11-20T00:00:00.000Z"
    };
    const sanitized = sanitizeUser(raw);
    expect(sanitized.pin_hash).toBeUndefined();
    expect(sanitized.pin_salt).toBeUndefined();
    expect(sanitized.username).toBe("owner");
    expect(sanitized.is_active).toBe(true);
  });
});

describe("Auth Workflows & Repositories", function () {
  function setupTestEnvironment(clockOverride) {
    const database = openSqliteDatabase(":memory:");
    const unitOfWork = createSqliteUnitOfWork(database);
    const userRepository = createSqliteUserRepository(database);
    const sessionRepository = createSqliteSessionRepository(database);
    const idGenerator = createDefaultIdGenerator();
    let clock = createSystemClock();
    if (clockOverride) {
      clock = clockOverride;
    }

    const deps = {
      userRepository: userRepository,
      sessionRepository: sessionRepository,
      unitOfWork: unitOfWork,
      idGenerator: idGenerator,
      clock: clock
    };

    return {
      database: database,
      userRepository: userRepository,
      sessionRepository: sessionRepository,
      useCases: {
        getAuthStatus: createGetAuthStatusUseCase(deps),
        setupInitialOwner: createSetupInitialOwnerUseCase(deps),
        login: createLoginUseCase(deps),
        logout: createLogoutUseCase(deps),
        getCurrentUser: createGetCurrentUserUseCase(deps),
        createUser: createCreateUserUseCase(deps),
        updateUser: createUpdateUserUseCase(deps),
        listUsers: createListUsersUseCase(deps),
        changePin: createChangePinUseCase(deps)
      }
    };
  }

  it("handles initial owner setup and blocks subsequent setup attempts", async function () {
    const env = setupTestEnvironment();

    const statusBefore = await env.useCases.getAuthStatus();
    expect(statusBefore.is_setup_required).toBe(true);
    expect(statusBefore.user_count).toBe(0);

    const setupResult = await env.useCases.setupInitialOwner({
      username: "owner",
      full_name: "Maria Santos",
      pin: "1234"
    });

    expect(setupResult.user.username).toBe("owner");
    expect(setupResult.user.role).toBe(ROLES.OWNER);
    expect(setupResult.token).toBeDefined();

    const statusAfter = await env.useCases.getAuthStatus();
    expect(statusAfter.is_setup_required).toBe(false);
    expect(statusAfter.user_count).toBe(1);

    // Second setup attempt must fail
    await expect(
      env.useCases.setupInitialOwner({
        username: "owner2",
        full_name: "Second Owner",
        pin: "5678"
      })
    ).rejects.toThrow(ConflictError);

    env.database.close();
  });

  it("authenticates valid credentials and rejects invalid ones", async function () {
    const env = setupTestEnvironment();

    await env.useCases.setupInitialOwner({
      username: "owner",
      full_name: "Maria Santos",
      pin: "1234"
    });

    // Valid login
    const loginResult = await env.useCases.login({
      username: "owner",
      pin: "1234"
    });
    expect(loginResult.user.username).toBe("owner");
    expect(loginResult.token).toBeDefined();
    const storedSession = env.database
      .prepare("SELECT token, token_hashed FROM user_sessions WHERE user_id = ?")
      .get(loginResult.user.user_id);
    expect(storedSession.token).not.toBe(loginResult.token);
    expect(storedSession.token_hashed).toBe(1);

    // Verify current user through session token
    const currentUser = await env.useCases.getCurrentUser({ token: loginResult.token });
    expect(currentUser.username).toBe("owner");

    // Invalid PIN
    await expect(
      env.useCases.login({
        username: "owner",
        pin: "9999"
      })
    ).rejects.toThrow(UnauthorizedError);

    // Non-existent username
    await expect(
      env.useCases.login({
        username: "nonexistent",
        pin: "1234"
      })
    ).rejects.toThrow(UnauthorizedError);

    env.database.close();
  });

  it("uses the injected clock when calculating session expiry", async function () {
    const fixedClock = {
      nowIso() {
        return "2026-11-20T00:00:00.000Z";
      }
    };
    const env = setupTestEnvironment(fixedClock);

    const setupResult = await env.useCases.setupInitialOwner({
      username: "owner",
      full_name: "Maria Santos",
      pin: "1234"
    });

    expect(setupResult.expires_at).toBe("2026-11-21T00:00:00.000Z");

    const loginResult = await env.useCases.login({
      username: "owner",
      pin: "1234"
    });
    expect(loginResult.expires_at).toBe("2026-11-21T00:00:00.000Z");

    env.database.close();
  });

  it("invalidates session on logout", async function () {
    const env = setupTestEnvironment();

    const setupResult = await env.useCases.setupInitialOwner({
      username: "owner",
      full_name: "Maria Santos",
      pin: "1234"
    });

    const activeUser = await env.useCases.getCurrentUser({ token: setupResult.token });
    expect(activeUser).not.toBeNull();

    await env.useCases.logout({ token: setupResult.token });

    const afterLogout = await env.useCases.getCurrentUser({ token: setupResult.token });
    expect(afterLogout).toBeNull();

    env.database.close();
  });

  it("supports user creation, listing, updating, deactivation, and PIN change", async function () {
    const env = setupTestEnvironment();

    const owner = await env.useCases.setupInitialOwner({
      username: "owner",
      full_name: "Maria Santos",
      pin: "1234"
    });

    // Create cashier
    const cashier = await env.useCases.createUser({
      username: "cashier1",
      full_name: "Juan dela Cruz",
      role: ROLES.CASHIER,
      pin: "5678"
    });
    expect(cashier.username).toBe("cashier1");
    expect(cashier.role).toBe(ROLES.CASHIER);

    // Duplicate username throws ConflictError
    await expect(
      env.useCases.createUser({
        username: "cashier1",
        full_name: "Duplicate",
        role: ROLES.CASHIER,
        pin: "0000"
      })
    ).rejects.toThrow(ConflictError);

    // List users
    const allUsers = await env.useCases.listUsers();
    expect(allUsers.length).toBe(2);

    // Cashier login
    const cashierLogin = await env.useCases.login({
      username: "cashier1",
      pin: "5678"
    });
    expect(cashierLogin.user.username).toBe("cashier1");

    // Cashier changes PIN
    await env.useCases.changePin({
      userId: cashier.user_id,
      current_pin: "5678",
      new_pin: "8765"
    });

    // Old PIN rejected
    await expect(
      env.useCases.login({
        username: "cashier1",
        pin: "5678"
      })
    ).rejects.toThrow(UnauthorizedError);

    // New PIN accepted
    const reLogin = await env.useCases.login({
      username: "cashier1",
      pin: "8765"
    });
    expect(reLogin.user.username).toBe("cashier1");

    // Deactivate user - should revoke active sessions
    await expect(
      env.useCases.updateUser(cashier.user_id, { is_active: "false" })
    ).rejects.toThrow(ValidationError);

    await env.useCases.updateUser(cashier.user_id, { is_active: false });

    const sessionCheck = await env.useCases.getCurrentUser({ token: reLogin.token });
    expect(sessionCheck).toBeNull();

    await expect(
      env.useCases.login({
        username: "cashier1",
        pin: "8765"
      })
    ).rejects.toThrow(UnauthorizedError);

    await expect(
      env.useCases.updateUser(owner.user.user_id, { is_active: false })
    ).rejects.toThrow("At least one active owner account is required");

    await expect(
      env.useCases.updateUser(owner.user.user_id, { role: ROLES.CASHIER })
    ).rejects.toThrow("At least one active owner account is required");

    env.database.close();
  });
});
