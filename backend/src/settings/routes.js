import express from "express";
import { requireObjectBody } from "../shared/validation.js";

export function createSettingsRouter(dependencies) {
  const router = express.Router();
  const useCases = dependencies.useCases;

  router.get("/settings", async function getSettings(request, response) {
    const settings = await useCases.getSettings();
    response.json({ data: settings });
  });

  router.patch("/settings", async function updateSettings(request, response) {
    const updated = await useCases.updateSettings(requireObjectBody(request.body));
    response.json({ data: updated });
  });

  router.get("/settings/backup", async function downloadBackup(request, response) {
    const backup = await useCases.createDatabaseBackup();
    response.download(backup.path, backup.filename, backup.cleanup);
  });

  return router;
}
