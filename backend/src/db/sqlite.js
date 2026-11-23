import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const SCHEMA_PATH = path.join(import.meta.dirname, "schema.sql");
const SCHEMA_SQL = fs.readFileSync(SCHEMA_PATH, "utf8");

export function openSqliteDatabase(databasePath) {
  let targetPath = databasePath;
  if (!targetPath) {
    targetPath = ":memory:";
  }
  if (targetPath !== ":memory:") {
    const folderPath = path.dirname(targetPath);
    fs.mkdirSync(folderPath, { recursive: true });
  }

  const database = new DatabaseSync(targetPath);
  if (targetPath !== ":memory:") {
    database.exec("PRAGMA journal_mode = WAL");
  }
  database.exec("PRAGMA foreign_keys = ON");
  database.exec(SCHEMA_SQL);
  return database;
}

export function createSqliteUnitOfWork(database) {
  let activeDepth = 0;

  return {
    async run(work) {
      const isOuterTransaction = activeDepth === 0;
      const savepointName = "sp_" + String(activeDepth + 1);
      activeDepth = activeDepth + 1;

      if (isOuterTransaction) {
        database.exec("BEGIN IMMEDIATE");
      } else {
        database.exec("SAVEPOINT " + savepointName);
      }

      try {
        const result = await work();
        if (isOuterTransaction) {
          database.exec("COMMIT");
        } else {
          database.exec("RELEASE SAVEPOINT " + savepointName);
        }
        return result;
      } catch (error) {
        if (isOuterTransaction) {
          database.exec("ROLLBACK");
        } else {
          database.exec("ROLLBACK TO SAVEPOINT " + savepointName);
          database.exec("RELEASE SAVEPOINT " + savepointName);
        }
        throw error;
      } finally {
        activeDepth = activeDepth - 1;
      }
    }
  };
}