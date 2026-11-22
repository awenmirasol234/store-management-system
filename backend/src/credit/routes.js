import express from "express";

export function createCreditRouter(dependencies) {
  const router = express.Router();

  router.get("/customers", async function listCustomers(request, response) {
    const query = request.query.q;
    const customers = await dependencies.useCases.listCustomers({ query: query });
    response.json({ data: customers });
  });

  router.post("/customers", async function createCustomer(request, response) {
    const created = await dependencies.useCases.createCustomer(request.body);
    response.status(201).json({ data: created });
  });

  router.get("/customers/:customerId", async function getCustomer(request, response) {
    const customer = await dependencies.useCases.getCustomer({
      customer_id: request.params.customerId
    });
    response.json({ data: customer });
  });

  router.patch("/customers/:customerId", async function updateCustomer(request, response) {
    const payload = Object.assign({}, request.body, {
      customer_id: request.params.customerId
    });
    const updated = await dependencies.useCases.updateCustomer(payload);
    response.json({ data: updated });
  });

  router.post("/customers/:customerId/payments", async function recordPayment(request, response) {
    let createdBy = request.body.created_by;
    if (!createdBy && request.user && request.user.username) {
      createdBy = request.user.username;
    }
    const payload = Object.assign({}, request.body, {
      customer_id: request.params.customerId,
      created_by: createdBy
    });
    const result = await dependencies.useCases.recordPayment(payload);
    response.status(201).json({ data: result });
  });

  router.get("/customers/:customerId/transactions", async function listTransactions(request, response) {
    const transactions = await dependencies.useCases.listCreditTransactions({
      customer_id: request.params.customerId,
      limit: request.query.limit
    });
    response.json({ data: transactions });
  });

  return router;
}
