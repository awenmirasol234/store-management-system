import express from "express";

export function createShiftsRouter(dependencies) {
  const router = express.Router();
  const useCases = dependencies.useCases;

  router.post("/shifts/open", async function handleOpenShift(request, response, next) {
    try {
      let userId = null;
      if (request.user && request.user.user_id) {
        userId = request.user.user_id;
      } else if (request.body && request.body.user_id) {
        userId = request.body.user_id;
      }

      const result = await useCases.openShift({
        user_id: userId,
        opening_cash: request.body.opening_cash,
        notes: request.body.notes
      });
      response.status(201).json({ data: result.shift });
    } catch (error) {
      next(error);
    }
  });

  router.get("/shifts/active", async function handleGetActiveShift(request, response, next) {
    try {
      let userId = null;
      if (request.query && request.query.user_id) {
        userId = request.query.user_id;
      } else if (request.user && request.user.user_id) {
        userId = request.user.user_id;
      }

      const result = await useCases.getActiveShift({
        user_id: userId
      });
      response.json({ data: result });
    } catch (error) {
      next(error);
    }
  });

  router.post("/shifts/:shift_id/close", async function handleCloseShift(request, response, next) {
    try {
      let closedBy = null;
      if (request.user && request.user.user_id) {
        closedBy = request.user.user_id;
      } else if (request.body && request.body.closed_by) {
        closedBy = request.body.closed_by;
      }

      const result = await useCases.closeShift({
        shift_id: request.params.shift_id,
        actual_cash: request.body.actual_cash,
        notes: request.body.notes,
        closed_by: closedBy
      });
      response.json({ data: result });
    } catch (error) {
      next(error);
    }
  });

  router.post(
    "/shifts/:shift_id/movements",
    async function handleRecordCashMovement(request, response, next) {
      try {
        let createdBy = "CASHIER";
        if (request.user && request.user.username) {
          createdBy = request.user.username;
        } else if (request.body && request.body.created_by) {
          createdBy = request.body.created_by;
        }

        const result = await useCases.recordCashMovement({
          shift_id: request.params.shift_id,
          type: request.body.type,
          amount: request.body.amount,
          remarks: request.body.remarks,
          created_by: createdBy
        });
        response.status(201).json({ data: result.cash_movement });
      } catch (error) {
        next(error);
      }
    }
  );

  router.get("/shifts/:shift_id", async function handleGetShift(request, response, next) {
    try {
      const result = await useCases.getShift({
        shift_id: request.params.shift_id
      });
      response.json({ data: result });
    } catch (error) {
      next(error);
    }
  });

  router.get("/shifts", async function handleListShifts(request, response, next) {
    try {
      const result = await useCases.listShifts({
        user_id: request.query.user_id,
        status: request.query.status,
        limit: request.query.limit,
        offset: request.query.offset
      });
      response.json({ data: result });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
