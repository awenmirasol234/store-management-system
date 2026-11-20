import express from "express";
import { ValidationError } from "../shared/errors.js";

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function resolveDateParam(rawValue, fallbackDate, fieldName) {
  if (rawValue === undefined || rawValue === null || String(rawValue).trim().length === 0) {
    return fallbackDate;
  }
  const text = String(rawValue).trim();
  if (!ISO_DATE_PATTERN.test(text)) {
    throw new ValidationError(fieldName + " must use YYYY-MM-DD format");
  }
  return text;
}

export function createReportsRouter(dependencies) {
  const router = express.Router();

  router.get("/reports/summary", async function getSummary(request, response) {
    const today = dependencies.clock.todayManilaIsoDate();
    const fromDate = resolveDateParam(request.query.from, today, "from");
    const toDate = resolveDateParam(request.query.to, today, "to");
    const summary = await dependencies.reportsRepository.getSummary(fromDate, toDate);
    response.json({ data: summary });
  });

  router.get("/reports/top-products", async function getTopProducts(request, response) {
    const today = dependencies.clock.todayManilaIsoDate();
    const fromDate = resolveDateParam(request.query.from, today, "from");
    const toDate = resolveDateParam(request.query.to, today, "to");
    let limit = 10;
    if (request.query.limit !== undefined) {
      const parsed = Number(request.query.limit);
      if (Number.isInteger(parsed) && parsed > 0) {
        limit = parsed;
      }
    }
    const items = await dependencies.reportsRepository.getTopProducts(fromDate, toDate, limit);
    response.json({ data: items });
  });

  router.get("/reports/daily", async function getDaily(request, response) {
    const today = dependencies.clock.todayManilaIsoDate();
    const fromDate = resolveDateParam(request.query.from, today, "from");
    const toDate = resolveDateParam(request.query.to, today, "to");
    const rows = await dependencies.reportsRepository.getDailyBreakdown(fromDate, toDate);
    response.json({ data: rows });
  });

  return router;
}
