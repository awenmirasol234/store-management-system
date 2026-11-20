import express from "express";

export function createReportsRouter(dependencies) {
  const router = express.Router();

  router.get("/reports/summary", async function getSummary(request, response) {
    const summary = await dependencies.useCases.getSummary(request.query);
    response.json({ data: summary });
  });

  router.get("/reports/top-products", async function getTopProducts(request, response) {
    const items = await dependencies.useCases.getTopProducts(request.query);
    response.json({ data: items });
  });

  router.get("/reports/daily", async function getDaily(request, response) {
    const rows = await dependencies.useCases.getDailyBreakdown(request.query);
    response.json({ data: rows });
  });

  return router;
}
