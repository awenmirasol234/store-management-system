import express from "express";
import { SHIFT_STATUSES } from "./domain.js";
import { ForbiddenError } from "../shared/errors.js";
import {
  normalizeOptionalEnum,
  normalizeOptionalQueryText,
  parseNonNegativeOffset,
  parsePositiveLimit,
  requireObjectBody,
  requireRouteParam
} from "../shared/validation.js";

export function createShiftsRouter(dependencies) {
  const router = express.Router();
  const useCases = dependencies.useCases;

  function ensureShiftAccess(request, shift) {
    if (!request.user || request.user.role === "OWNER") {
      return;
    }
    if (!shift || shift.user_id !== request.user.user_id) {
      throw new ForbiddenError("You can only access your own shifts");
    }
  }

  router.post("/shifts/open", async function handleOpenShift(request, response) {
    const body = requireObjectBody(request.body);
    let userId = null;
    if (request.user && request.user.user_id) {
      userId = request.user.user_id;
    } else if (body.user_id) {
      userId = body.user_id;
    }

    const result = await useCases.openShift({
      user_id: userId,
      opening_cash: body.opening_cash,
      notes: body.notes
    });
    response.status(201).json({ data: result.shift });
  });

  router.get("/shifts/active", async function handleGetActiveShift(request, response) {
    let userId = null;
    if (request.user && request.user.role !== "OWNER") {
      userId = request.user.user_id;
    } else if (request.query && request.query.user_id) {
      userId = normalizeOptionalQueryText(request.query.user_id, "user_id");
    } else if (request.user && request.user.user_id) {
      userId = request.user.user_id;
    }

    const result = await useCases.getActiveShift({
      user_id: userId
    });
    response.json({ data: result });
  });

  router.post("/shifts/:shift_id/close", async function handleCloseShift(request, response) {
    const body = requireObjectBody(request.body);
    const shiftId = requireRouteParam(request.params, "shift_id");
    const existingShift = await useCases.getShift({
      shift_id: shiftId
    });
    ensureShiftAccess(request, existingShift.shift);
    let closedBy = null;
    if (request.user && request.user.user_id) {
      closedBy = request.user.user_id;
    } else if (body.closed_by) {
      closedBy = body.closed_by;
    }

    const result = await useCases.closeShift({
      shift_id: shiftId,
      actual_cash: body.actual_cash,
      notes: body.notes,
      closed_by: closedBy
    });
    response.json({ data: result });
  });

  router.post(
    "/shifts/:shift_id/movements",
    async function handleRecordCashMovement(request, response) {
      const body = requireObjectBody(request.body);
      let createdBy = "CASHIER";
      if (request.user && request.user.username) {
        createdBy = request.user.username;
      } else if (body.created_by) {
        createdBy = body.created_by;
      }

      const shift = await useCases.getShift({
        shift_id: requireRouteParam(request.params, "shift_id")
      });
      ensureShiftAccess(request, shift.shift);
      const result = await useCases.recordCashMovement({
        shift_id: requireRouteParam(request.params, "shift_id"),
        type: body.type,
        amount: body.amount,
        remarks: body.remarks,
        created_by: createdBy
      });
      response.status(201).json({ data: result.cash_movement });
    }
  );

  router.get("/shifts/:shift_id", async function handleGetShift(request, response) {
    const result = await useCases.getShift({
      shift_id: requireRouteParam(request.params, "shift_id")
    });
    ensureShiftAccess(request, result.shift);
    response.json({ data: result });
  });

  router.get("/shifts", async function handleListShifts(request, response) {
    let userId = normalizeOptionalQueryText(request.query.user_id, "user_id");
    if (request.user && request.user.role !== "OWNER") {
      userId = request.user.user_id;
    }
    const result = await useCases.listShifts({
      user_id: userId,
      status: normalizeOptionalEnum(
        request.query.status,
        new Set(Object.values(SHIFT_STATUSES)),
        "status"
      ),
      limit: parsePositiveLimit(request.query.limit, undefined, "limit"),
      offset: parseNonNegativeOffset(request.query.offset, undefined, "offset")
    });
    response.json({ data: result });
  });

  return router;
}
