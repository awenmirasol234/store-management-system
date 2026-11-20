import path from "node:path";
import { createApp } from "./app.js";

const backendRoot = path.resolve(import.meta.dirname, "..");
const portValue = Number(process.env.PORT) || 3001;
const databasePath = process.env.DATABASE_PATH || path.join(backendRoot, "data", "store.db");
const uploadsDir = process.env.UPLOADS_DIR || path.join(backendRoot, "uploads");

const runtime = createApp({
  databasePath: databasePath,
  uploadsDir: uploadsDir
});

runtime.app.listen(portValue, function onStarted() {
  console.log("Store Management API running on http://localhost:" + String(portValue));
});
