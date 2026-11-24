import express from "express";
import { parsePositiveLimit, requireObjectBody, requireRouteParam } from "../shared/validation.js";

export function createSalesRouter(dependencies) {
  const router = express.Router();

  router.post("/sales/calculate", async function calculateCart(request, response) {
    const preview = await dependencies.useCases.calculateCartTotals(requireObjectBody(request.body));
    response.json({ data: preview });
  });

  router.post("/sales", async function createSale(request, response) {
    const result = await dependencies.useCases.processSale(requireObjectBody(request.body));
    response.status(201).json({ data: result });
  });

  router.get("/sales", async function listSales(request, response) {
    const sales = await dependencies.useCases.listSales({
      limit: parsePositiveLimit(request.query.limit, undefined, "limit")
    });
    response.json({ data: sales });
  });

  router.get("/sales/:saleId", async function getSale(request, response) {
    const record = await dependencies.useCases.getSale({
      sale_id: requireRouteParam(request.params, "saleId")
    });
    response.json({ data: record });
  });

  router.post("/sales/:saleId/returns", async function createReturn(request, response) {
    const payload = Object.assign({}, requireObjectBody(request.body), {
      sale_id: requireRouteParam(request.params, "saleId")
    });
    const result = await dependencies.useCases.processReturn(payload);
    response.status(201).json({ data: result });
  });

  return router;
}
