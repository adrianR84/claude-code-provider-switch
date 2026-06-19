/**
 * Shared interactive model selection TUI for provider implementations.
 * Encapsulates virtual scrolling, arrow-key navigation, search filtering,
 * and debounced input — used identically by openrouter, anthropic, and ollama.
 */

const readline = require("readline");
const { log } = require("./config");
const { DEFAULT_MODELS } = require("./constants");

const VIRTUAL_WINDOW_SIZE = 20;
const DEBOUNCE_DELAY = 300;

/**
 * Build a metadata annotation string for a model.
 * Override via options.metadataFormatter.
 * @param {object} model
 * @returns {string}
 */
function defaultMetadataFormatter(model) {
  return "";
}

/**
 * @typedef {object} ShowModelSelectionOptions
 * @property {'id'|'name'} [displayField='id']   - Which model field to display
 * @property {(model: object) => string} [metadataFormatter] - Extra annotation after model name
 * @property {string} [providerName] - Human name for log messages (e.g. "OpenRouter")
 * @property {string} [cacheKey]     - Cache key prefix (e.g. "openrouter-models")
 * @property {string} [defaultModel] - Default model constant from DEFAULT_MODELS
 */

/**
 * Interactive model selector with virtual scrolling, search filtering, and arrow keys.
 *
 * @param {object[]} sortedModels  - Pre-sorted list of model objects (already filtered/sorted by caller)
 * @param {string}   defaultModel  - The provider default model name
 * @param {object}   options
 * @returns {Promise<string>} Selected model name
 */
function showModelSelection(sortedModels, defaultModel, options = {}) {
  const {
    displayField = "id",
    metadataFormatter = defaultMetadataFormatter,
    providerName = "",
    defaultModelConstant = "",
  } = options;

  let currentFilter = "";
  let filteredModels = sortedModels.slice(0, 50);

  let virtualOffset = 0;

  // --- Display -----------------------------------------------------------
  function displayModels(modelList, showHeader = true) {
    if (showHeader) {
      console.clear();
      log(
        `Found ${sortedModels.length} models. Start typing to filter, or press Enter to select.`,
        "green",
      );
      log('Type "exit" to cancel and use default model.', "yellow");
      log("", "reset");
      log("Selection Options:", "yellow");
      log("• Type number to select a model from the list", "reset");
      log("• Type model name to search/filter", "reset");
      log("• Press Enter to select the first model", "reset");
      log("• Use ↑/↓ to scroll through results", "reset");
      log("", "reset");
      process.stdout.write("\x1b[s"); // Save cursor
    } else {
      process.stdout.write("\x1b[u"); // Restore cursor
      process.stdout.write("\x1b[0J"); // Clear to end of screen
    }

    if (modelList.length === 0) {
      log("No models match your search.", "red");
      log("", "reset");
      return;
    }

    const virtualWindow = modelList.slice(
      virtualOffset,
      virtualOffset + VIRTUAL_WINDOW_SIZE,
    );

    virtualWindow.forEach((model, index) => {
      const meta = metadataFormatter(model);
      const fieldValue = model[displayField] || "";
      const isDefault = defaultModel && fieldValue === defaultModel;
      const defaultText = isDefault ? " [DEFAULT]" : "";
      const color = isDefault ? "green" : "reset";
      const actualIndex = virtualOffset + index + 1;
      log(`${actualIndex}) ${fieldValue}${meta}${defaultText}`, color);
    });

    if (modelList.length > VIRTUAL_WINDOW_SIZE) {
      log("", "reset");
      if (virtualOffset > 0) {
        log("▲ Scroll up for more results", "yellow");
      }
      if (virtualOffset + VIRTUAL_WINDOW_SIZE < modelList.length) {
        log(
          `▼ Showing ${virtualOffset + 1}-${Math.min(
            virtualOffset + VIRTUAL_WINDOW_SIZE,
            modelList.length,
          )} of ${modelList.length} results`,
          "yellow",
        );
      }
    }

    if (showHeader) {
      log("", "reset");
      rl.prompt();
    }
  }

  // --- Input setup -------------------------------------------------------
  if (process.stdin.setRawMode) {
    process.stdin.setRawMode(true);
  }
  readline.emitKeypressEvents(process.stdin);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "Search models: ",
  });

  // --- Resolve default model offset --------------------------------------
  const initialModels = sortedModels.slice(0, 50);
  virtualOffset = 0;
  const defaultIndex = initialModels.findIndex(
    (m) => m[displayField] === defaultModel,
  );
  if (defaultIndex >= 0) {
    virtualOffset = Math.max(0, defaultIndex - VIRTUAL_WINDOW_SIZE + 1);
  }
  filteredModels = initialModels;

  displayModels(filteredModels, true);

  let inputTimeout = null;
  let lastInputTime = 0;

  // --- Promise-based line input ------------------------------------------
  return new Promise((resolvePromise) => {
    // --- Key handlers ------------------------------------------------------
    const handleKeyPress = (str, key) => {
      if (key.name === "up") {
        if (virtualOffset > 0) {
          virtualOffset = Math.max(0, virtualOffset - VIRTUAL_WINDOW_SIZE);
          displayModels(filteredModels, false);
        }
      } else if (key.name === "down") {
        if (virtualOffset + VIRTUAL_WINDOW_SIZE < filteredModels.length) {
          virtualOffset = Math.min(
            filteredModels.length - VIRTUAL_WINDOW_SIZE,
            virtualOffset + VIRTUAL_WINDOW_SIZE,
          );
          displayModels(filteredModels, false);
        }
      } else if (key.name === "escape") {
        rl.close();
        log(`Using default model: ${defaultModelConstant || defaultModel}`, "yellow");
        resolvePromise(defaultModelConstant || defaultModel);
      }
    };

    process.stdin.on("keypress", handleKeyPress);

    rl.on("line", (input) => {
      const trimmedInput = input.trim().toLowerCase();
      const currentTime = Date.now();

      // Debounce rapid inputs
      if (currentTime - lastInputTime < 100) {
        return;
      }
      lastInputTime = currentTime;

      // Exit commands
      if (trimmedInput === "exit" || trimmedInput === "quit") {
        rl.close();
        log(`Using default model: ${defaultModelConstant || defaultModel}`, "yellow");
        resolvePromise(defaultModelConstant || defaultModel);
        return;
      }
      if (trimmedInput === "" || trimmedInput === "") {
        rl.close();
        log(`Using default model: ${defaultModelConstant || defaultModel}`, "yellow");
        resolvePromise(defaultModelConstant || defaultModel);
        return;
      }

      // Numeric selection relative to virtual window
      const selection = parseInt(trimmedInput);
      if (
        !isNaN(selection) &&
        selection > 0 &&
        selection <=
          Math.min(VIRTUAL_WINDOW_SIZE, filteredModels.length - virtualOffset)
      ) {
        const selected = filteredModels[virtualOffset + selection - 1];
        rl.close();
        log(`Selected model: ${selected[displayField]}`, "yellow");
        resolvePromise(selected[displayField]);
        return;
      }

      // Empty input → first model
      if (trimmedInput === "") {
        if (filteredModels.length > 0) {
          const selected = filteredModels[0];
          rl.close();
          log(`Selected model: ${selected[displayField]}`, "yellow");
          resolvePromise(selected[displayField]);
          return;
        }
      }

      // Update filter
      if (inputTimeout) {
        clearTimeout(inputTimeout);
      }

      currentFilter = trimmedInput;

      if (currentFilter === "") {
        // BUG FIX: use sortedModels (not models) to respect default ordering
        filteredModels = sortedModels.slice(0, 50);
        virtualOffset = 0;
      } else {
        filteredModels = sortedModels
          .filter((m) =>
            (m[displayField] || "").toLowerCase().includes(currentFilter),
          )
          .slice(0, 50);

        const defIdx = filteredModels.findIndex(
          (m) => m[displayField] === defaultModel,
        );
        virtualOffset = defIdx >= 0
          ? Math.max(0, defIdx - VIRTUAL_WINDOW_SIZE + 1)
          : 0;
      }

      inputTimeout = setTimeout(() => {
        displayModels(filteredModels, false);
      }, DEBOUNCE_DELAY);
    });

    rl.on("close", () => {
      if (!rl.closed) {
        rl.closed = true;
      }
    });
  });
}

module.exports = { showModelSelection };
