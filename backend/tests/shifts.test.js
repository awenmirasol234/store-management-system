import { describe, expect, it } from "vitest";
import {
  CASH_MOVEMENT_TYPES,
  calculateExpectedCash,
  calculateVariance,
  createCashMovementEntity,
  createCashierShiftEntity,
  SHIFT_STATUSES
} from "../src/shifts/domain.js";
import {
  createCloseShiftUseCase,
  createGetActiveShiftUseCase,
  createGetShiftUseCase,
  createListShiftsUseCase,
  createOpenShiftUseCase,
  createRecordCashMovementUseCase
} from "../src/shifts/use-cases.js";
import {
  createSqliteCashMovementRepository,
  createSqliteShiftRepository
} from "../src/shifts/sqlite-repo.js";
import { openSqliteDatabase } from "../src/db/sqlite.js";
import { createApp } from "../src/app.js";

describe("Cashier Shifts & Cash Drawer Reconciliation", function () {
  describe("Domain & Mathematical Rules", function () {
    it("calculates expected cash with centavo precision", function () {
      const expected = calculateExpectedCash({
        opening_cash: 1000.5,
        cash_sales: 2500.25,
        cash_utang_payments: 500,
        cash_in: 300,
        cash_out: 200.75,
        cash_refunds: 100
      });
      // 1000.50 + 2500.25 + 500.00 + 300.00 - 200.75 - 100.00 = 4000.00
      expect(expected).toBe(4000);
    });

    it("calculates cash variance correctly for shortage, balanced, and overage", function () {
      const shortage = calculateVariance(3950, 4000);
      expect(shortage).toBe(-50);

      const balanced = calculateVariance(4000, 4000);
      expect(balanced).toBe(0);

      const overage = calculateVariance(4050.25, 4000);
      expect(overage).toBe(50.25);
    });

    it("validates shift entity creation", function () {
      expect(function () {
        createCashierShiftEntity({
          shift_id: "s1",
          user_id: "u1",
          opened_at: "2026-11-22T08:00:00Z",
          opening_cash: -100
        });
      }).toThrow("opening_cash cannot be negative");

      const shift = createCashierShiftEntity({
        shift_id: "s1",
        user_id: "u1",
        opened_at: "2026-11-22T08:00:00Z",
        opening_cash: 500
      });
      expect(shift.status).toBe(SHIFT_STATUSES.OPEN);
      expect(shift.opening_cash).toBe(500);
    });

    it("validates cash movement entity creation", function () {
      expect(function () {
        createCashMovementEntity({
          movement_id: "m1",
          shift_id: "s1",
          type: "INVALID_TYPE",
          amount: 100,
          remarks: "Test",
          created_by: "cashier1",
          created_at: "2026-11-22T08:00:00Z"
        });
      }).toThrow("Invalid cash movement type");

      expect(function () {
        createCashMovementEntity({
          movement_id: "m1",
          shift_id: "s1",
          type: CASH_MOVEMENT_TYPES.CASH_IN,
          amount: 0,
          remarks: "Test",
          created_by: "cashier1",
          created_at: "2026-11-22T08:00:00Z"
        });
      }).toThrow("amount must be greater than zero");
    });
  });

  describe("Application Use Cases (In-Memory)", function () {
    function createInMemoryShiftRepo() {
      const shifts = new Map();
      return {
        shifts: shifts,
        async save(shift) {
          shifts.set(shift.shift_id, Object.assign({}, shift));
          return shift;
        },
        async findById(shiftId) {
          const shift = shifts.get(shiftId);
          if (!shift) {
            return null;
          }
          return Object.assign({}, shift);
        },
        async findActiveByUserId(userId) {
          for (const shift of shifts.values()) {
            if (shift.user_id === userId && shift.status === SHIFT_STATUSES.OPEN) {
              return Object.assign({}, shift);
            }
          }
          return null;
        },
        async getShiftTotals(shiftId) {
          return {
            cash_sales: 1500,
            cash_utang_payments: 200,
            cash_in: 100,
            cash_out: 50,
            cash_refunds: 0
          };
        },
        async list(filters) {
          return Array.from(shifts.values());
        }
      };
    }

    function createInMemoryMovementRepo() {
      const movements = [];
      return {
        movements: movements,
        async save(m) {
          movements.push(Object.assign({}, m));
          return m;
        },
        async listByShiftId(shiftId) {
          return movements.filter(function (m) {
            return m.shift_id === shiftId;
          });
        }
      };
    }

    it("opens shift and rejects opening a second concurrent shift", async function () {
      const shiftRepo = createInMemoryShiftRepo();
      const movementRepo = createInMemoryMovementRepo();
      let idCounter = 1;

      const deps = {
        shiftRepository: shiftRepo,
        cashMovementRepository: movementRepo,
        idGenerator: {
          nextId: function () {
            idCounter = idCounter + 1;
            return "shift-" + idCounter;
          }
        },
        clock: {
          nowIso: function () {
            return "2026-11-22T10:00:00.000Z";
          }
        }
      };

      const openShift = createOpenShiftUseCase(deps);
      const res1 = await openShift({
        user_id: "user-1",
        opening_cash: 500,
        notes: "Morning shift"
      });
      expect(res1.shift.status).toBe("OPEN");
      expect(res1.shift.opening_cash).toBe(500);

      await expect(
        openShift({
          user_id: "user-1",
          opening_cash: 300
        })
      ).rejects.toThrow("User already has an active shift");
    });

    it("records cash movements and rejects movements on closed shifts", async function () {
      const shiftRepo = createInMemoryShiftRepo();
      const movementRepo = createInMemoryMovementRepo();

      const deps = {
        shiftRepository: shiftRepo,
        cashMovementRepository: movementRepo,
        idGenerator: {
          nextId: function () {
            return "m-" + Math.random();
          }
        },
        clock: {
          nowIso: function () {
            return "2026-11-22T10:00:00.000Z";
          }
        }
      };

      await shiftRepo.save({
        shift_id: "s-open",
        user_id: "u-1",
        opened_at: "2026-11-22T08:00:00Z",
        opening_cash: 500,
        status: SHIFT_STATUSES.OPEN
      });
      await shiftRepo.save({
        shift_id: "s-closed",
        user_id: "u-2",
        opened_at: "2026-11-22T08:00:00Z",
        closed_at: "2026-11-22T16:00:00Z",
        opening_cash: 500,
        status: SHIFT_STATUSES.CLOSED
      });

      const recordMovement = createRecordCashMovementUseCase(deps);

      const inRes = await recordMovement({
        shift_id: "s-open",
        type: "CASH_IN",
        amount: 200,
        remarks: "Change fund topup",
        created_by: "cashier1"
      });
      expect(inRes.cash_movement.amount).toBe(200);

      await expect(
        recordMovement({
          shift_id: "s-closed",
          type: "CASH_OUT",
          amount: 50,
          remarks: "Ice",
          created_by: "cashier1"
        })
      ).rejects.toThrow("Cannot record cash movement on a closed shift");
    });

    it("closes shift and reconciles cash drawer totals", async function () {
      const shiftRepo = createInMemoryShiftRepo();
      const movementRepo = createInMemoryMovementRepo();

      const deps = {
        shiftRepository: shiftRepo,
        cashMovementRepository: movementRepo,
        idGenerator: {
          nextId: function () {
            return "gen-id";
          }
        },
        clock: {
          nowIso: function () {
            return "2026-11-22T18:00:00.000Z";
          }
        }
      };

      await shiftRepo.save({
        shift_id: "shift-reconcile",
        user_id: "cashier-10",
        opened_at: "2026-11-22T08:00:00Z",
        opening_cash: 1000,
        status: SHIFT_STATUSES.OPEN
      });

      const closeShift = createCloseShiftUseCase(deps);
      // Expected = 1000 (opening) + 1500 (sales) + 200 (utang) + 100 (in) - 50 (out) - 0 (refunds) = 2750.
      // Actual = 2700. Variance = -50 (shortage).
      const result = await closeShift({
        shift_id: "shift-reconcile",
        actual_cash: 2700,
        notes: "₱50 shortage"
      });

      expect(result.shift.status).toBe(SHIFT_STATUSES.CLOSED);
      expect(result.shift.expected_cash).toBe(2750);
      expect(result.shift.actual_cash).toBe(2700);
      expect(result.shift.variance).toBe(-50);
      expect(result.summary.cash_sales).toBe(1500);

      await expect(
        closeShift({
          shift_id: "shift-reconcile",
          actual_cash: 2700
        })
      ).rejects.toThrow("Shift is already closed");
    });
  });

  describe("SQLite Persistence & Shift Aggregation", function () {
    it("prevents a second open shift for the same user at the database boundary", async function () {
      const db = openSqliteDatabase(":memory:");
      const shiftRepo = createSqliteShiftRepository(db);
      db.prepare(`
        INSERT INTO users (user_id, username, full_name, role, pin_hash, pin_salt, created_at, updated_at)
        VALUES ('cashier-one', 'cashier_one', 'Cashier One', 'CASHIER', 'hash', 'salt', ?, ?)
      `).run("2026-11-25T08:00:00.000Z", "2026-11-25T08:00:00.000Z");
      const firstShift = {
        shift_id: "shift-first",
        user_id: "cashier-one",
        opened_at: "2026-11-25T08:00:00.000Z",
        closed_at: null,
        opening_cash: 100,
        expected_cash: null,
        actual_cash: null,
        variance: null,
        notes: null,
        status: "OPEN"
      };
      await shiftRepo.save(firstShift);

      await expect(
        shiftRepo.save(Object.assign({}, firstShift, { shift_id: "shift-second" }))
      ).rejects.toThrow("User already has an active shift");
      expect((await shiftRepo.findActiveByUserId("cashier-one")).shift_id).toBe("shift-first");
      db.close();
    });

    it("persists and aggregates live ledger totals across sales, credit, returns, and cash movements", async function () {
      const db = openSqliteDatabase(":memory:");
      const shiftRepo = createSqliteShiftRepository(db);
      const movementRepo = createSqliteCashMovementRepository(db);

      // Create test user
      db.prepare(`
        INSERT INTO users (user_id, username, full_name, role, pin_hash, pin_salt, created_at, updated_at)
        VALUES ('u-sql', 'cashier_sql', 'Cashier SQL', 'CASHIER', 'hash', 'salt', '2026-11-22T00:00:00Z', '2026-11-22T00:00:00Z')
      `).run();

      // Create product for sales/returns
      db.prepare(`
        INSERT INTO products (product_id, product_name, base_unit, selling_price_int, created_at, updated_at)
        VALUES ('p-1', 'Test Product', 'pc', 10000, '2026-11-22T00:00:00Z', '2026-11-22T00:00:00Z')
      `).run();

      // Create customer for credit
      db.prepare(`
        INSERT INTO customers (customer_id, full_name, current_balance_int, created_at, updated_at)
        VALUES ('c-1', 'Customer Juan', 100000, '2026-11-22T00:00:00Z', '2026-11-22T00:00:00Z')
      `).run();

      const shiftId = "shift-sql-1";
      await shiftRepo.save({
        shift_id: shiftId,
        user_id: "u-sql",
        opened_at: "2026-11-22T08:00:00Z",
        closed_at: null,
        opening_cash: 1000,
        expected_cash: null,
        actual_cash: null,
        variance: null,
        notes: null,
        status: "OPEN"
      });

      // 1. Sale linked to shift: Cash portion = ₱2,500 (250000 centavos)
      db.prepare(`
        INSERT INTO sales_transactions (
          sale_id, receipt_number, shift_id, customer_id, payment_method,
          subtotal_amount_int, discount_amount_int, total_amount_int,
          cash_amount_int, credit_amount_int, amount_paid_int, change_amount_int,
          status, created_by, created_at
        ) VALUES (
          'sale-1', '20261122-0001', 'shift-sql-1', NULL, 'CASH',
          250000, 0, 250000, 250000, 0, 250000, 0, 'COMPLETED', 'u-sql', '2026-11-22T09:00:00Z'
        )
      `).run();

      // 2. Customer utang payment linked to shift: ₱500 (50000 centavos)
      db.prepare(`
        INSERT INTO credit_transactions (
          credit_tx_id, customer_id, sale_id, shift_id, type, amount_int, remarks, created_by, created_at
        ) VALUES (
          'ctx-1', 'c-1', NULL, 'shift-sql-1', 'PAYMENT', 50000, 'Partial payment', 'u-sql', '2026-11-22T10:00:00Z'
        )
      `).run();

      // 3. Cash movement: CASH_IN = ₱300
      await movementRepo.save({
        movement_id: "mov-1",
        shift_id: shiftId,
        type: "CASH_IN",
        amount: 300,
        remarks: "Change fund added",
        created_by: "cashier_sql",
        created_at: "2026-11-22T11:00:00Z"
      });

      // 4. Cash movement: CASH_OUT = ₱200
      await movementRepo.save({
        movement_id: "mov-2",
        shift_id: shiftId,
        type: "CASH_OUT",
        amount: 200,
        remarks: "Paid delivery rider",
        created_by: "cashier_sql",
        created_at: "2026-11-22T12:00:00Z"
      });

      // 5. Sales return linked to shift: Cash refund = ₱100 (10000 centavos)
      db.prepare(`
        INSERT INTO sales_returns (
          return_id, sale_id, shift_id, total_refund_amount_int,
          credit_refund_amount_int, cash_refund_amount_int,
          remarks, created_by, created_at
        ) VALUES (
          'ret-1', 'sale-1', 'shift-sql-1', 10000, 0, 10000, 'Defective item', 'u-sql', '2026-11-22T13:00:00Z'
        )
      `).run();

      // Query totals
      const totals = await shiftRepo.getShiftTotals(shiftId);
      expect(totals.cash_sales).toBe(2500);
      expect(totals.cash_utang_payments).toBe(500);
      expect(totals.cash_in).toBe(300);
      expect(totals.cash_out).toBe(200);
      expect(totals.cash_refunds).toBe(100);

      // Verify active shift lookup
      const activeShift = await shiftRepo.findActiveByUserId("u-sql");
      expect(activeShift.shift_id).toBe(shiftId);
      expect(activeShift.status).toBe("OPEN");
    });
  });

  describe("Express REST API", function () {
    let server = null;
    let baseUrl = "";

    async function startServer() {
      const appRoot = createApp({
        databasePath: ":memory:",
        enforceAuth: false
      });

      // Seed a user
      appRoot.database
        .prepare(`
          INSERT INTO users (user_id, username, full_name, role, pin_hash, pin_salt, created_at, updated_at)
          VALUES ('user-api-1', 'pos_cashier', 'POS Cashier', 'CASHIER', 'hash', 'salt', '2026-11-22T00:00:00Z', '2026-11-22T00:00:00Z')
        `)
        .run();

      return new Promise(function (resolve) {
        server = appRoot.app.listen(0, function () {
          const port = server.address().port;
          baseUrl = "http://127.0.0.1:" + port;
          resolve();
        });
      });
    }

    async function stopServer() {
      if (server) {
        await new Promise(function (resolve) {
          server.close(resolve);
        });
      }
    }

    it("handles shift opening, active query, cash movement, and closing", async function () {
      await startServer();
      try {
        // 1. Open shift
        const openRes = await fetch(baseUrl + "/api/shifts/open", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: "user-api-1",
            opening_cash: 1500,
            notes: "Opening shift"
          })
        });
        expect(openRes.status).toBe(201);
        const openBody = await openRes.json();
        const shiftId = openBody.data.shift_id;
        expect(shiftId).toBeDefined();
        expect(openBody.data.status).toBe("OPEN");

        // 2. Query active shift
        const activeRes = await fetch(baseUrl + "/api/shifts/active?user_id=user-api-1");
        expect(activeRes.status).toBe(200);
        const activeBody = await activeRes.json();
        expect(activeBody.data.shift.shift_id).toBe(shiftId);
        expect(activeBody.data.summary.opening_cash).toBe(1500);
        expect(activeBody.data.summary.expected_cash).toBe(1500);

        // 3. Record cash movement (CASH_IN)
        const moveRes = await fetch(baseUrl + "/api/shifts/" + shiftId + "/movements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "CASH_IN",
            amount: 500,
            remarks: "Change fund added",
            created_by: "pos_cashier"
          })
        });
        expect(moveRes.status).toBe(201);
        const moveBody = await moveRes.json();
        expect(moveBody.data.amount).toBe(500);

        // 4. Close shift
        const closeRes = await fetch(baseUrl + "/api/shifts/" + shiftId + "/close", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            actual_cash: 2000,
            notes: "End of shift count balanced"
          })
        });
        expect(closeRes.status).toBe(200);
        const closeBody = await closeRes.json();
        expect(closeBody.data.shift.status).toBe("CLOSED");
        expect(closeBody.data.shift.expected_cash).toBe(2000);
        expect(closeBody.data.shift.actual_cash).toBe(2000);
        expect(closeBody.data.shift.variance).toBe(0);

        // 5. Query shift details
        const getRes = await fetch(baseUrl + "/api/shifts/" + shiftId);
        expect(getRes.status).toBe(200);
        const getBody = await getRes.json();
        expect(getBody.data.shift.shift_id).toBe(shiftId);
        expect(getBody.data.movements.length).toBe(1);

        // 6. Active shift is now null
        const emptyActiveRes = await fetch(baseUrl + "/api/shifts/active?user_id=user-api-1");
        const emptyActiveBody = await emptyActiveRes.json();
        expect(emptyActiveBody.data).toBe(null);
      } finally {
        await stopServer();
      }
    });
  });
});
