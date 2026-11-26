import express from "express";
import fs from "node:fs";
import path from "node:path";
import { requireObjectBody } from "../shared/validation.js";

export function createSettingsRouter(dependencies) {
  const router = express.Router();
  const useCases = dependencies.useCases;
  const databasePath = dependencies.databasePath;
  const database = dependencies.database;

  router.get("/settings", async function getSettings(request, response, next) {
    try {
      const settings = await useCases.getSettings();
      response.json({ data: settings });
    } catch (error) {
      next(error);
    }
  });

  router.patch("/settings", async function updateSettings(request, response, next) {
    try {
      const updated = await useCases.updateSettings(requireObjectBody(request.body));
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

      // shortcut: disk-based SQLite backup using VACUUM INTO, upgrade to streaming WAL replication or cloud snapshot for multi-node deployments.
      const tempBackupFile = path.join(
        path.dirname(databasePath),
        "backup-" + String(Date.now()) + "-" + String(Math.floor(Math.random() * 10000)) + ".db"
      );
      const safeSqlPath = tempBackupFile.replace(/\\/g, "/");
      database.exec("VACUUM INTO '" + safeSqlPath + "'");

      const dateStr = new Date().toISOString().slice(0, 10);
      const filename = "storeflow-backup-" + dateStr + ".db";
      response.download(tempBackupFile, filename, function cleanup() {
        fs.unlink(tempBackupFile, function onUnlink() {});
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
