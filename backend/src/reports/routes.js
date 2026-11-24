import express from "express";
import { normalizeOptionalQueryText, parsePositiveLimit } from "../shared/validation.js";

function validatedReportQuery(query) {
  return {
    from: normalizeOptionalQueryText(query.from, "from"),
    to: normalizeOptionalQueryText(query.to, "to"),
    limit: parsePositiveLimit(query.limit, undefined, "limit")
  };
}

export function createReportsRouter(dependencies) {
  const router = express.Router();

  router.get("/reports/summary", async function getSummary(request, response) {
    const summary = await dependencies.useCases.getSummary(validatedReportQuery(request.query));
    response.json({ data: summary });
  });

  router.get("/reports/top-products", async function getTopProducts(request, response) {
    const items = await dependencies.useCases.getTopProducts(validatedReportQuery(request.query));
    response.json({ data: items });
  });

  router.get("/reports/daily", async function getDaily(request, response) {
    const rows = await dependencies.useCases.getDailyBreakdown(validatedReportQuery(request.query));
    response.json({ data: rows });
  });

  router.get("/reports/categories", async function getCategories(request, response) {
    const rows = await dependencies.useCases.getCategorySales(validatedReportQuery(request.query));
    response.json({ data: rows });
  });

  router.get("/reports/stock-movements", async function getStockMovements(request, response) {
    const rows = await dependencies.useCases.getStockMovementReport(validatedReportQuery(request.query));
    response.json({ data: rows });
  });

  router.get("/reports/transactions", async function getTransactions(request, response) {
    const rows = await dependencies.useCases.getTransactionsReport(validatedReportQuery(request.query));
    response.json({ data: rows });
  });

  return router;
}
