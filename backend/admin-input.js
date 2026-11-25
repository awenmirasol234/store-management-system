export function readHiddenInput(promptText, input, output) {
  return new Promise(function readInput(resolve, reject) {
    if (!input.isTTY || typeof input.setRawMode !== "function") {
      reject(
        new Error("Run this command with an interactive terminal, such as docker compose exec -it.")
      );
      return;
    }

    let value = "";
    output.write(promptText);

    function finish(error) {
      input.off("data", handleInput);
      input.setRawMode(false);
      input.pause();
      output.write("\n");
      if (error) {
        reject(error);
        return;
      }
      resolve(value);
    }

    function handleInput(inputText) {
      for (const character of inputText) {
        if (character === "\u0003" || character === "\u0004") {
          finish(new Error("Cancelled"));
          return;
        }
        if (character === "\r" || character === "\n") {
          finish(null);
          return;
        }
        if (character === "\u007f" || character === "\b") {
          value = Array.from(value).slice(0, -1).join("");
          continue;
        }
        value = value + character;
      }
    }

    input.setEncoding("utf8");
    input.setRawMode(true);
    input.resume();
    input.on("data", handleInput);
  });
}
