import { EventEmitter } from "node:events";
import { describe, expect, it } from "vitest";
import { readHiddenInput } from "../admin-input.js";

function createTerminal() {
  const input = new EventEmitter();
  const output = {
    text: "",
    write(text) {
      this.text = this.text + text;
    }
  };
  const rawModeChanges = [];
  input.isTTY = true;
  input.setEncoding = function setEncoding() {};
  input.setRawMode = function setRawMode(enabled) {
    rawModeChanges.push(enabled);
  };
  input.resume = function resume() {};
  input.pause = function pause() {};

  return {
    input: input,
    output: output,
    rawModeChanges: rawModeChanges
  };
}

describe("hidden terminal input", function () {
  it("reads input without echo and handles backspace", async function () {
    const terminal = createTerminal();
    const result = readHiddenInput("PIN: ", terminal.input, terminal.output);

    terminal.input.emit("data", "12\u007f34\r");

    await expect(result).resolves.toBe("134");
    expect(terminal.output.text).toBe("PIN: \n");
    expect(terminal.rawModeChanges).toEqual([true, false]);
  });

  it("restores terminal mode when the user cancels", async function () {
    const terminal = createTerminal();
    const result = readHiddenInput("PIN: ", terminal.input, terminal.output);

    terminal.input.emit("data", "\u0003");

    await expect(result).rejects.toThrow("Cancelled");
    expect(terminal.rawModeChanges).toEqual([true, false]);
  });

  it("rejects input when no interactive terminal is available", async function () {
    const terminal = createTerminal();
    terminal.input.isTTY = false;

    await expect(
      readHiddenInput("PIN: ", terminal.input, terminal.output)
    ).rejects.toThrow("interactive terminal");
    expect(terminal.rawModeChanges).toEqual([]);
  });
});
