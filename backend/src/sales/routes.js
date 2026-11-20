import express from "express";
import { NotFoundError } from "../shared/errors.js";

export function createSalesRouter(dependencies) {
  const router = express.Router();

  router.post("/sales/calculate", async function calculateCart(request, response) {
    const preview = await dependencies.useCases.calculateCartTotals(request.body);
    response.json({ data: preview });
  });

  router.post("/sales", async function createSale(request, response) {
    const result = await dependencies.useCases.processSale(request.body);
    response.status(201).json({ data: result });
  });

  router.get("/sales", async function listSales(request, response) {
    let limit = 50;
    if (request.query.limit !== undefined) {
      const parsed = Number(request.query.limit);
      if (Number.isInteger(parsed) && parsed > 0) {
        limit = parsed;
      }
    }
    const sales = await dependencies.salesRepository.listRecentSales(limit);
    response.json({ data: sales });
  });

  router.get("/sales/:saleId", async function getSale(request, response) {
    const record = await dependencies.salesRepository.findSaleById(request.params.saleId);
    if (!record) {
      throw new NotFoundError("Sale not found: " + request.params.saleId);
    }
    response.json({ data: record });
  });

  router.post("/sales/:saleId/returns", async function createReturn(request, response) {
    const payload = Object.assign({}, request.body, {
      sale_id: request.params.saleId
    });
    const result = await dependencies.useCases.processReturn(payload);
    response.status(201).json({ data: result });
  });

  return router;
}
