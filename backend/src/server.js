import "dotenv/config";
import { createApp } from "./app.js";

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error("Missing required environment variable: " + name);
  }
  return value;
}

const portValue = Number(requireEnv("PORT"));
if (!Number.isInteger(portValue) || portValue <= 0) {
  throw new Error("PORT must be a positive integer");
}
const databasePath = requireEnv("DATABASE_PATH");
const uploadsDir = requireEnv("UPLOADS_DIR");

const runtime = createApp({
  databasePath: databasePath,
  uploadsDir: uploadsDir
});

runtime.app.listen(portValue, function onStarted() {
  console.log("Store Management API running on http://localhost:" + String(portValue));
});
