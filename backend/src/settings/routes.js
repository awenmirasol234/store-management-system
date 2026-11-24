import express from "express";
import fs from "node:fs";
import { requireObjectBody } from "../shared/validation.js";

export function createSettingsRouter(dependencies) {
  const router = express.Router();
  const useCases = dependencies.useCases;
  const databasePath = dependencies.databasePath;

  router.get("/settings", async function getSettings(request, response, next) {
    try {
      const settings = await useCases.getSettings.execute();
      response.json({ data: settings });
    } catch (error) {
      next(error);
    }
  });

  router.patch("/settings", async function updateSettings(request, response, next) {
    try {
      const updated = await useCases.updateSettings.execute(requireObjectBody(request.body));
      response.json({ data: updated });
    } catch (error) {
      next(error);
    }
  });

  router.get("/settings/backup", async function downloadBackup(request, response, next) {
    try {
      if (!databasePath || databasePath === ":memory:" || !fs.existsSync(databasePath)) {
        response.status(400).json({
          error: {
            code: "BACKUP_UNAVAILABLE",
            message: "Database backup is only available for disk-based databases"
          }
        });
        return;
      }

      const dateStr = new Date().toISOString().slice(0, 10);
      const filename = "storeflow-backup-" + dateStr + ".db";
      response.download(databasePath, filename);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
