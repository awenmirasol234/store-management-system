import { fromMoneyInt, toMoneyInt } from "../shared/decimal.js";

function mapShiftRow(row) {
  if (!row) {
    return null;
  }
  let expectedCash = null;
  if (row.expected_cash_int !== null && row.expected_cash_int !== undefined) {
    expectedCash = fromMoneyInt(row.expected_cash_int);
  }
  let actualCash = null;
  if (row.actual_cash_int !== null && row.actual_cash_int !== undefined) {
    actualCash = fromMoneyInt(row.actual_cash_int);
  }
  let variance = null;
  if (row.variance_int !== null && row.variance_int !== undefined) {
    variance = fromMoneyInt(row.variance_int);
  }

  return {
    shift_id: row.shift_id,
    user_id: row.user_id,
    opened_at: row.opened_at,
    closed_at: row.closed_at,
    opening_cash: fromMoneyInt(row.opening_cash_int),
    expected_cash: expectedCash,
    actual_cash: actualCash,
    variance: variance,
    notes: row.notes,
    status: row.status
  };
}

function mapCashMovementRow(row) {
  if (!row) {
    return null;
  }
  return {
    movement_id: row.movement_id,
    shift_id: row.shift_id,
    type: row.type,
    amount: fromMoneyInt(row.amount_int),
    remarks: row.remarks,
    created_by: row.created_by,
    created_at: row.created_at
  };
}

export function createSqliteShiftRepository(database) {
  const insertStmt = database.prepare(`
    INSERT INTO cashier_shifts (
      shift_id, user_id, opened_at, closed_at,
      opening_cash_int, expected_cash_int, actual_cash_int, variance_int,
      notes, status
    ) VALUES (
      @shift_id, @user_id, @opened_at, @closed_at,
      @opening_cash_int, @expected_cash_int, @actual_cash_int, @variance_int,
      @notes, @status
    )
  `);

  const updateStmt = database.prepare(`
    UPDATE cashier_shifts
    SET closed_at = @closed_at,
        expected_cash_int = @expected_cash_int,
        actual_cash_int = @actual_cash_int,
        variance_int = @variance_int,
        notes = @notes,
        status = @status
    WHERE shift_id = @shift_id
  `);

  const findByIdStmt = database.prepare(`
    SELECT * FROM cashier_shifts WHERE shift_id = ?
  `);

  const findActiveByUserStmt = database.prepare(`
    SELECT * FROM cashier_shifts
    WHERE user_id = ? AND status = 'OPEN'
    ORDER BY opened_at DESC
    LIMIT 1
  `);

  const salesTotalStmt = database.prepare(`
    SELECT COALESCE(SUM(cash_amount_int), 0) AS total
    FROM sales_transactions
    WHERE shift_id = ? AND status = 'COMPLETED'
  `);

  const utangTotalStmt = database.prepare(`
    SELECT COALESCE(SUM(amount_int), 0) AS total
    FROM credit_transactions
    WHERE shift_id = ? AND type = 'PAYMENT'
  `);

  const cashInTotalStmt = database.prepare(`
    SELECT COALESCE(SUM(amount_int), 0) AS total
    FROM cash_movements
    WHERE shift_id = ? AND type = 'CASH_IN'
  `);

  const cashOutTotalStmt = database.prepare(`
    SELECT COALESCE(SUM(amount_int), 0) AS total
    FROM cash_movements
    WHERE shift_id = ? AND type = 'CASH_OUT'
  `);

  const refundTotalStmt = database.prepare(`
    SELECT COALESCE(SUM(cash_refund_amount_int), 0) AS total
    FROM sales_returns
    WHERE shift_id = ?
  `);

  const listByUserAndStatusStmt = database.prepare(`
    SELECT * FROM cashier_shifts
    WHERE user_id = ? AND status = ?
    ORDER BY opened_at DESC
    LIMIT ? OFFSET ?
  `);

  const listByUserStmt = database.prepare(`
    SELECT * FROM cashier_shifts
    WHERE user_id = ?
    ORDER BY opened_at DESC
    LIMIT ? OFFSET ?
  `);

  const listByStatusStmt = database.prepare(`
    SELECT * FROM cashier_shifts
    WHERE status = ?
    ORDER BY opened_at DESC
    LIMIT ? OFFSET ?
  `);

  const listAllShiftsStmt = database.prepare(`
    SELECT * FROM cashier_shifts
    ORDER BY opened_at DESC
    LIMIT ? OFFSET ?
  `);

  return {
    async save(shift) {
      let expectedInt = null;
      if (shift.expected_cash !== null && shift.expected_cash !== undefined) {
        expectedInt = toMoneyInt(shift.expected_cash, "expected_cash");
      }
      let actualInt = null;
      if (shift.actual_cash !== null && shift.actual_cash !== undefined) {
        actualInt = toMoneyInt(shift.actual_cash, "actual_cash");
      }
      let varianceInt = null;
      if (shift.variance !== null && shift.variance !== undefined) {
        varianceInt = toMoneyInt(shift.variance, "variance");
      }

      const existing = findByIdStmt.get(shift.shift_id);
      if (existing) {
        updateStmt.run({
          shift_id: shift.shift_id,
          closed_at: shift.closed_at,
          expected_cash_int: expectedInt,
          actual_cash_int: actualInt,
          variance_int: varianceInt,
          notes: shift.notes,
          status: shift.status
        });
      } else {
        insertStmt.run({
          shift_id: shift.shift_id,
          user_id: shift.user_id,
          opened_at: shift.opened_at,
          closed_at: shift.closed_at,
          opening_cash_int: toMoneyInt(shift.opening_cash, "opening_cash"),
          expected_cash_int: expectedInt,
          actual_cash_int: actualInt,
          variance_int: varianceInt,
          notes: shift.notes,
          status: shift.status
        });
      }
      return shift;
    },

    async findById(shiftId) {
      const row = findByIdStmt.get(shiftId);
      return mapShiftRow(row);
    },

    async findActiveByUserId(userId) {
      const row = findActiveByUserStmt.get(userId);
      return mapShiftRow(row);
    },

    async getShiftTotals(shiftId) {
      const salesRow = salesTotalStmt.get(shiftId);
      const utangRow = utangTotalStmt.get(shiftId);
      const inRow = cashInTotalStmt.get(shiftId);
      const outRow = cashOutTotalStmt.get(shiftId);
      const refundRow = refundTotalStmt.get(shiftId);

      return {
        cash_sales: fromMoneyInt(salesRow.total),
        cash_utang_payments: fromMoneyInt(utangRow.total),
        cash_in: fromMoneyInt(inRow.total),
        cash_out: fromMoneyInt(outRow.total),
        cash_refunds: fromMoneyInt(refundRow.total)
      };
    },

    async list(filters) {
      const safeFilters = filters || {};
      let limit = 50;
      if (safeFilters.limit) {
        const parsedLimit = Number(safeFilters.limit);
        if (Number.isInteger(parsedLimit) && parsedLimit > 0) {
          limit = parsedLimit;
        }
      }
      let offset = 0;
      if (safeFilters.offset) {
        const parsedOffset = Number(safeFilters.offset);
        if (Number.isInteger(parsedOffset) && parsedOffset >= 0) {
          offset = parsedOffset;
        }
      }

      let rows = [];
      if (safeFilters.user_id && safeFilters.status) {
        rows = listByUserAndStatusStmt.all(safeFilters.user_id, safeFilters.status, limit, offset);
      } else if (safeFilters.user_id) {
        rows = listByUserStmt.all(safeFilters.user_id, limit, offset);
      } else if (safeFilters.status) {
        rows = listByStatusStmt.all(safeFilters.status, limit, offset);
      } else {
        rows = listAllShiftsStmt.all(limit, offset);
      }

      const listResult = [];
      for (let i = 0; i < rows.length; i = i + 1) {
        listResult.push(mapShiftRow(rows[i]));
      }
      return listResult;
    }
  };
}

export function createSqliteCashMovementRepository(database) {
  const insertStmt = database.prepare(`
    INSERT INTO cash_movements (
      movement_id, shift_id, type, amount_int, remarks, created_by, created_at
    ) VALUES (
      @movement_id, @shift_id, @type, @amount_int, @remarks, @created_by, @created_at
    )
  `);

  const listByShiftStmt = database.prepare(`
    SELECT * FROM cash_movements
    WHERE shift_id = ?
    ORDER BY created_at ASC
  `);

  return {
    async save(movement) {
      insertStmt.run({
        movement_id: movement.movement_id,
        shift_id: movement.shift_id,
        type: movement.type,
        amount_int: toMoneyInt(movement.amount, "amount"),
        remarks: movement.remarks,
        created_by: movement.created_by,
        created_at: movement.created_at
      });
      return movement;
    },

    async listByShiftId(shiftId) {
      const rows = listByShiftStmt.all(shiftId);
      const result = [];
      for (let i = 0; i < rows.length; i = i + 1) {
        result.push(mapCashMovementRow(rows[i]));
      }
      return result;
    }
  };
}
