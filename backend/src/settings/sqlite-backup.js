import fs from "node:fs";
import path from "node:path";
import { DatabaseBackupUnavailableError } from "./domain.js";

export function createSqliteBackupService(dependencies) {
  return {
    async createBackup() {
      const databasePath = dependencies.databasePath;
      if (!databasePath || databasePath === ":memory:" || !fs.existsSync(databasePath)) {
        throw new DatabaseBackupUnavailableError();
      }

      // shortcut: disk-based SQLite backup using VACUUM INTO, upgrade to streaming WAL replication or cloud snapshot for multi-node deployments.
      const backupPath = path.join(
        path.dirname(databasePath),
        "backup-" + dependencies.idGenerator.nextId() + ".db"
      );
      const safeSqlPath = backupPath
        .replace(/\\/g, "/")
        .replace(/'/g, "''");
      dependencies.database.exec("VACUUM INTO '" + safeSqlPath + "'");

      return {
        path: backupPath,
        cleanup() {
          fs.unlink(backupPath, function onUnlink() {});
        }
      };
    }
  };
}
