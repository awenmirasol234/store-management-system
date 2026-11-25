import express from "express";
import {
  normalizeOptionalQueryText,
  parsePositiveLimit,
  requireObjectBody,
  requireRouteParam
} from "../shared/validation.js";

export function createCreditRouter(dependencies) {
  const router = express.Router();

  router.get("/customers", async function listCustomers(request, response) {
    const query = normalizeOptionalQueryText(request.query.q, "q");
    const customers = await dependencies.useCases.listCustomers({ query: query });
    response.json({ data: customers });
  });

  router.post("/customers", async function createCustomer(request, response) {
    const created = await dependencies.useCases.createCustomer(requireObjectBody(request.body));
    response.status(201).json({ data: created });
  });

  router.get("/customers/:customerId", async function getCustomer(request, response) {
    const customer = await dependencies.useCases.getCustomer({
      customer_id: requireRouteParam(request.params, "customerId")
    });
    response.json({ data: customer });
  });

  router.patch("/customers/:customerId", async function updateCustomer(request, response) {
    const payload = Object.assign({}, requireObjectBody(request.body), {
      customer_id: requireRouteParam(request.params, "customerId")
    });
    const updated = await dependencies.useCases.updateCustomer(payload);
    response.json({ data: updated });
  });

  router.post("/customers/:customerId/payments", async function recordPayment(request, response) {
    const body = requireObjectBody(request.body);
    let createdBy = body.created_by;
    let actorUserId = null;
    if (request.user && request.user.username) {
      createdBy = request.user.username;
      actorUserId = request.user.user_id;
    }
    const payload = Object.assign({}, body, {
      customer_id: requireRouteParam(request.params, "customerId"),
      created_by: createdBy,
      actor_user_id: actorUserId
    });
    const result = await dependencies.useCases.recordPayment(payload);
    response.status(201).json({ data: result });
  });

  router.get("/customers/:customerId/transactions", async function listTransactions(request, response) {
    const transactions = await dependencies.useCases.listCreditTransactions({
      customer_id: requireRouteParam(request.params, "customerId"),
      limit: parsePositiveLimit(request.query.limit, undefined, "limit")
    });
    response.json({ data: transactions });
  });

  return router;
}
