import fs from "node:fs";
import { AsyncLocalStorage } from "node:async_hooks";
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

// shortcut: in-memory promise queue serializes concurrent writes in single Node process, upgrade to external locking if multiple API server instances share the SQLite file.
export function createSqliteUnitOfWork(database) {
  const transactionStorage = new AsyncLocalStorage();
  let transactionQueue = Promise.resolve();

  async function runNestedTransaction(work, transaction) {
    const depth = transaction.depth + 1;
    const savepointName = "sp_" + String(depth);
    transaction.depth = depth;
    database.exec("SAVEPOINT " + savepointName);

    try {
      const result = await work();
      database.exec("RELEASE SAVEPOINT " + savepointName);
      return result;
    } catch (error) {
      database.exec("ROLLBACK TO SAVEPOINT " + savepointName);
      database.exec("RELEASE SAVEPOINT " + savepointName);
      throw error;
    } finally {
      transaction.depth = transaction.depth - 1;
    }
  }

  return {
    async run(work) {
      const activeTransaction = transactionStorage.getStore();
      if (activeTransaction) {
        return runNestedTransaction(work, activeTransaction);
      }

      let releaseTransaction;
      const transactionGate = new Promise(function waitForTransaction(resolve) {
        releaseTransaction = resolve;
      });
      const previousTransaction = transactionQueue;
      transactionQueue = transactionQueue.then(function waitForPreviousTransaction() {
        return transactionGate;
      });
      await previousTransaction;

      const transaction = { depth: 0 };
      try {
        return await transactionStorage.run(transaction, async function runTransaction() {
          database.exec("BEGIN IMMEDIATE");
          try {
            const result = await work();
            database.exec("COMMIT");
            return result;
          } catch (error) {
            database.exec("ROLLBACK");
            throw error;
          }
        });
      } finally {
        releaseTransaction();
      }
    }
  };
}
