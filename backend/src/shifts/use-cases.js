import { ConflictError, NotFoundError, ValidationError } from "../shared/errors.js";
import {
  calculateExpectedCash,
  calculateVariance,
  createCashMovementEntity,
  createCashierShiftEntity,
  SHIFT_STATUSES,
  validateActualCash
} from "./domain.js";
import { normalizeOptionalText, requireNonEmptyText } from "../shared/validation.js";

function runInUnitOfWork(dependencies, work) {
  if (dependencies.unitOfWork) {
    return dependencies.unitOfWork.run(work);
  }
  return work();
}

export function createOpenShiftUseCase(dependencies) {
  return async function openShift(input) {
    const safeInput = input || {};
    return runInUnitOfWork(dependencies, async function runOpenShift() {
      const userId = requireNonEmptyText(safeInput.user_id, "user_id");

      if (dependencies.userRepository) {
        const user = await dependencies.userRepository.findById(userId);
        if (!user) {
          throw new NotFoundError("User not found");
        }
        if (!user.is_active) {
          throw new ValidationError("User account is inactive");
        }
      }

      const existing = await dependencies.shiftRepository.findActiveByUserId(userId);
      if (existing) {
        throw new ConflictError("User already has an active shift");
      }

      const shiftId = dependencies.idGenerator.nextId();
      const now = dependencies.clock.nowIso();
      const shift = createCashierShiftEntity({
        shift_id: shiftId,
        user_id: userId,
        opened_at: now,
        closed_at: null,
        opening_cash: safeInput.opening_cash,
        expected_cash: null,
        actual_cash: null,
        variance: null,
        notes: safeInput.notes,
        status: SHIFT_STATUSES.OPEN
      });

      try {
        await dependencies.shiftRepository.save(shift);
      } catch (error) {
        if (error.message === "User already has an active shift") {
          throw new ConflictError("User already has an active shift");
        }
        throw error;
      }
      return { shift: shift };
    });
  };
}

export function createGetActiveShiftUseCase(dependencies) {
  return async function getActiveShift(input) {
    const safeInput = input || {};
    const userId = requireNonEmptyText(safeInput.user_id, "user_id");

    const shift = await dependencies.shiftRepository.findActiveByUserId(userId);
    if (!shift) {
      return null;
    }

    const totals = await dependencies.shiftRepository.getShiftTotals(shift.shift_id);
    const combinedTotals = Object.assign({}, totals, {
      opening_cash: shift.opening_cash
    });
    const expectedCash = calculateExpectedCash(combinedTotals);
    const summary = Object.assign({}, combinedTotals, {
      expected_cash: expectedCash
    });

    return {
      shift: shift,
      summary: summary
    };
  };
}

export function createRecordCashMovementUseCase(dependencies) {
  return async function recordCashMovement(input) {
    const safeInput = input || {};
    return runInUnitOfWork(dependencies, async function runRecordCashMovement() {
      const shiftId = requireNonEmptyText(safeInput.shift_id, "shift_id");

      const shift = await dependencies.shiftRepository.findById(shiftId);
      if (!shift) {
        throw new NotFoundError("Shift not found");
      }
      if (shift.status !== SHIFT_STATUSES.OPEN) {
        throw new ValidationError("Cannot record cash movement on a closed shift");
      }

      const movementId = dependencies.idGenerator.nextId();
      const now = dependencies.clock.nowIso();
      const movement = createCashMovementEntity({
        movement_id: movementId,
        shift_id: shiftId,
        type: safeInput.type,
        amount: safeInput.amount,
        remarks: safeInput.remarks,
        created_by: safeInput.created_by,
        created_at: now
      });

      await dependencies.cashMovementRepository.save(movement);
      return { cash_movement: movement };
    });
  };
}

export function createCloseShiftUseCase(dependencies) {
  return async function closeShift(input) {
    const safeInput = input || {};
    return runInUnitOfWork(dependencies, async function runCloseShift() {
      const shiftId = requireNonEmptyText(safeInput.shift_id, "shift_id");

      const shift = await dependencies.shiftRepository.findById(shiftId);
      if (!shift) {
        throw new NotFoundError("Shift not found");
      }
      if (shift.status !== SHIFT_STATUSES.OPEN) {
        throw new ValidationError("Shift is already closed");
      }

      const actualCash = validateActualCash(safeInput.actual_cash);
      const totals = await dependencies.shiftRepository.getShiftTotals(shiftId);
      const combinedTotals = Object.assign({}, totals, {
        opening_cash: shift.opening_cash
      });
      const expectedCash = calculateExpectedCash(combinedTotals);
      const variance = calculateVariance(actualCash, expectedCash);
      const now = dependencies.clock.nowIso();

      const additionalNotes = normalizeOptionalText(safeInput.notes, "notes");
      let finalNotes = shift.notes;
      if (additionalNotes !== null) {
        if (finalNotes) {
          finalNotes = finalNotes + " | " + additionalNotes;
        } else {
          finalNotes = additionalNotes;
        }
      }

      const updatedShift = Object.assign({}, shift, {
        status: SHIFT_STATUSES.CLOSED,
        closed_at: now,
        expected_cash: expectedCash,
        actual_cash: actualCash,
        variance: variance,
        notes: finalNotes
      });

      await dependencies.shiftRepository.save(updatedShift);

      const summary = Object.assign({}, combinedTotals, {
        expected_cash: expectedCash,
        actual_cash: actualCash,
        variance: variance
      });

      return {
        shift: updatedShift,
        summary: summary
      };
    });
  };
}

export function createGetShiftUseCase(dependencies) {
  return async function getShift(input) {
    const safeInput = input || {};
    const shiftId = requireNonEmptyText(safeInput.shift_id, "shift_id");

    const shift = await dependencies.shiftRepository.findById(shiftId);
    if (!shift) {
      throw new NotFoundError("Shift not found");
    }

    const totals = await dependencies.shiftRepository.getShiftTotals(shiftId);
    const movements = await dependencies.cashMovementRepository.listByShiftId(shiftId);
    const combinedTotals = Object.assign({}, totals, {
      opening_cash: shift.opening_cash
    });

    let expectedCash = shift.expected_cash;
    if (expectedCash === null || expectedCash === undefined) {
      expectedCash = calculateExpectedCash(combinedTotals);
    }

    let variance = shift.variance;
    if (shift.actual_cash !== null && shift.actual_cash !== undefined) {
      if (variance === null || variance === undefined) {
        variance = calculateVariance(shift.actual_cash, expectedCash);
      }
    }

    const summary = Object.assign({}, combinedTotals, {
      expected_cash: expectedCash,
      actual_cash: shift.actual_cash,
      variance: variance
    });

    return {
      shift: shift,
      movements: movements,
      summary: summary
    };
  };
}

export function createListShiftsUseCase(dependencies) {
  return async function listShifts(input) {
    const filters = input || {};
    return dependencies.shiftRepository.list(filters);
  };
}
