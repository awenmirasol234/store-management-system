import fs from "node:fs";
import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { readHiddenInput } from "./admin-input.js";
import { openSqliteDatabase } from "./src/db/sqlite.js";
import { createSqliteUserRepository } from "./src/auth/sqlite-repo.js";
import { createCreateUserUseCase } from "./src/auth/use-cases.js";
import { createDefaultIdGenerator, createSystemClock } from "./src/shared/ports.js";

async function main() {
  const databasePath = process.env.DATABASE_PATH;
  if (!databasePath || databasePath === ":memory:" || !fs.existsSync(databasePath)) {
    throw new Error("DATABASE_PATH must point to an existing disk-based database");
  }

  const prompts = readline.createInterface({ input: stdin, output: stdout });
  let database = null;
  try {
    const username = await prompts.question("Username: ");
    const fullName = await prompts.question("Full name: ");
    prompts.close();

    const pin = await readHiddenInput("PIN (4–8 characters): ", stdin, stdout);
    const pinConfirmation = await readHiddenInput("Confirm PIN: ", stdin, stdout);
    if (pin !== pinConfirmation) {
      throw new Error("PINs do not match");
    }

    database = openSqliteDatabase(databasePath);
    const createUser = createCreateUserUseCase({
      userRepository: createSqliteUserRepository(database),
      idGenerator: createDefaultIdGenerator(),
      clock: createSystemClock()
    });
    const user = await createUser({
      username: username,
      full_name: fullName,
      role: "OWNER",
      pin: pin
    });

    stdout.write("Created OWNER account for " + user.username + ". Sign in through the app.\n");
  } finally {
    prompts.close();
    if (database) {
      database.close();
    }
  }
}

main().catch(function reportError(error) {
  stdout.write("Could not create OWNER account: " + error.message + "\n");
  process.exitCode = 1;
});
