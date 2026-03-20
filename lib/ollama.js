/**
 * Ollama provider implementation
 */

const http = require("http");
const https = require("https");
const { spawn } = require("child_process");
const {
  log,
  loadEnvFile,
  findBestMatchingModel,
  promptForApiKey,
  updateConfigFile,
} = require("./config");
const { modelCache } = require("./cache");
const { OLLAMA, CACHE, HTTP_STATUS, DEFAULT_MODELS } = require("./constants");
const { NetworkError, ValidationError } = require("./errors");
const { validateAuthToken, validateModelResponse } = require("./validation");

/**
 * Fetch available models from Ollama API with caching
 */
function fetchOllamaModels(authToken = null) {
  return new Promise((resolve, reject) => {
    const cachedModels = modelCache.get(CACHE.KEYS.OLLAMA_MODELS);
    if (cachedModels && Array.isArray(cachedModels)) {
      resolve(cachedModels);
      return;
    }

    // Clear invalid cache entry if it exists
    if (cachedModels && !Array.isArray(cachedModels)) {
      modelCache.clear(CACHE.KEYS.OLLAMA_MODELS);
    }

    const options = {
      hostname: OLLAMA.DEFAULT_HOST,
      port: OLLAMA.DEFAULT_PORT,
      path: OLLAMA.API_PATH,
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(authToken && {
          Authorization: `${OLLAMA.AUTH_HEADER} ${authToken}`,
        }),
      },
    };

    const req = http.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        try {
          const response = JSON.parse(data);
          const models = response.models || response.data || response; // Handle models, data, or direct array

          // Cache the response
          modelCache.set(CACHE.KEYS.OLLAMA_MODELS, models);

          resolve(models);
        } catch (error) {
          reject(
            new Error(`Failed to parse Ollama API response: ${error.message}`),
          );
        }
      });
    });

    req.on("error", (error) => {
      reject(new Error(`Failed to fetch models: ${error.message}`));
    });

    req.setTimeout(OLLAMA.TIMEOUT, () => {
      req.destroy();
      reject(new Error("Request timeout - failed to fetch models from Ollama"));
    });

    req.end();
  });
}

/**
 * Show interactive model selection for Ollama
 */
async function showModelSelection() {
  const envVars = loadEnvFile();
  let authToken = envVars && envVars.OLLAMA_AUTH_TOKEN;

  if (!authToken) {
    log("Ollama auth token not found. Please provide it:", "red");
    const newToken = await promptForApiKey("Ollama", "OLLAMA_AUTH_TOKEN");
    if (!newToken) {
      log("Ollama auth token is required for model selection", "red");
      process.exit(1);
    }
    updateConfigFile("OLLAMA_AUTH_TOKEN", newToken, null);
    authToken = newToken;
  }

  log("Fetching available models from Ollama...", "yellow");

  try {
    const models = await fetchOllamaModels(authToken);

    // Get default model for this provider
    const { getProviderDefaultModel } = require("./config");
    const defaultModel = getProviderDefaultModel("ollama");

    // Sort models to put default model first
    const sortedModels = [...models];
    const defaultIndex = sortedModels.findIndex(
      (model) => model.name === defaultModel,
    );
    if (defaultIndex > 0) {
      // Move default model to the beginning
      const [defaultModelObj] = sortedModels.splice(defaultIndex, 1);
      sortedModels.unshift(defaultModelObj);
    }

    log(
      `Found ${models.length} models. Start typing to filter, or press Enter to select.`,
      "green",
    );
    log('Type "exit" to cancel and use default model.', "yellow");
    log("", "reset");

    // Use readline for interactive input with filtering
    const readline = require("readline");
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: "Search models: ",
    });

    let currentFilter = "";
    let filteredModels = sortedModels.slice(0, 50); // Start with first 50 models

    // Virtual scrolling state
    let virtualOffset = 0;
    const VIRTUAL_WINDOW_SIZE = 20;

    function displayModels(modelList, showHeader = true, defaultModel = null) {
      if (showHeader) {
        // Clear screen and show header
        console.clear();
        log(
          `Found ${models.length} models. Start typing to filter, or press Enter to select.`,
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

        // Save cursor position after header for future selective clearing
        process.stdout.write("\x1b[s"); // Save cursor position
      } else {
        // Only clear model list area, preserve header
        // Restore cursor position and clear from there down
        process.stdout.write("\x1b[u"); // Restore cursor position
        process.stdout.write("\x1b[0J"); // Clear from cursor to end of screen
      }

      if (modelList.length === 0) {
        log("No models match your search.", "red");
        log("", "reset");
        return;
      }

      // Virtual window - only render visible items
      const virtualWindow = modelList.slice(
        virtualOffset,
        virtualOffset + VIRTUAL_WINDOW_SIZE,
      );

      virtualWindow.forEach((model, index) => {
        const size = model.size ? ` (${model.size})` : "";
        const isDefault = defaultModel && model.name === defaultModel;
        const defaultText = isDefault ? " [DEFAULT]" : "";
        const color = isDefault ? "green" : "reset";
        const actualIndex = virtualOffset + index + 1;
        log(`${actualIndex}) ${model.name}${size}${defaultText}`, color);
      });

      // Show scroll indicators
      if (modelList.length > VIRTUAL_WINDOW_SIZE) {
        log("", "reset");
        if (virtualOffset > 0) {
          log("▲ Scroll up for more results", "yellow");
        }
        if (virtualOffset + VIRTUAL_WINDOW_SIZE < modelList.length) {
          log(
            `▼ Showing ${virtualOffset + 1}-${Math.min(virtualOffset + VIRTUAL_WINDOW_SIZE, modelList.length)} of ${modelList.length} results`,
            "yellow",
          );
        }
      }

      if (showHeader) {
        log("", "reset");
        rl.prompt();
      }
    }

    // Set up keypress events for better input handling
    if (process.stdin.setRawMode) {
      process.stdin.setRawMode(true);
    }

    return new Promise((resolve) => {
      // Initial display - go through filter logic to set correct offset
      currentFilter = "";
      const initialModels = sortedModels.slice(0, 50);
      virtualOffset = 0;

      // Find default model in initial results and adjust offset
      const defaultIndex = initialModels.findIndex(
        (model) => model.name === defaultModel,
      );
      if (defaultIndex >= 0) {
        // Calculate offset to show default model in first window
        virtualOffset = Math.max(0, defaultIndex - VIRTUAL_WINDOW_SIZE + 1);
      }

      filteredModels = initialModels;

      // Initial display
      displayModels(filteredModels, true, defaultModel);

      // Add input debouncing to prevent duplicate characters
      let inputTimeout = null;
      let lastInputTime = 0;

      // Handle keypress events for virtual scrolling
      const handleKeyPress = (str, key) => {
        if (key.name === "up") {
          // Scroll up
          if (virtualOffset > 0) {
            virtualOffset = Math.max(0, virtualOffset - VIRTUAL_WINDOW_SIZE);
            displayModels(filteredModels, false, defaultModel);
          }
        } else if (key.name === "down") {
          // Scroll down
          if (virtualOffset + VIRTUAL_WINDOW_SIZE < filteredModels.length) {
            virtualOffset = Math.min(
              filteredModels.length - VIRTUAL_WINDOW_SIZE,
              virtualOffset + VIRTUAL_WINDOW_SIZE,
            );
            displayModels(filteredModels, false, defaultModel);
          }
        } else if (key.name === "escape") {
          rl.close();
          log(`Using default model: ${DEFAULT_MODELS.OLLAMA}`, "yellow");
          resolve(DEFAULT_MODELS.OLLAMA);
          return;
        }
      };

      // Set up keypress events
      readline.emitKeypressEvents(process.stdin);
      if (process.stdin.setRawMode) {
        process.stdin.setRawMode(true);
      }
      process.stdin.on("keypress", handleKeyPress);

      rl.on("line", (input) => {
        const trimmedInput = input.trim().toLowerCase();
        const currentTime = Date.now();

        // Debounce: ignore rapid successive inputs within 100ms
        if (currentTime - lastInputTime < 100) {
          return; // Skip this input
        }
        lastInputTime = currentTime;

        // Check for explicit exit commands only
        if (trimmedInput === "exit" || trimmedInput === "quit") {
          rl.close();
          log(`Using default model: ${DEFAULT_MODELS.OLLAMA}`, "yellow");
          resolve(DEFAULT_MODELS.OLLAMA);
          return;
        }

        // Special quit command (Ctrl+C or Ctrl+D) - only exit at main prompt
        if (trimmedInput === "\u0003" || trimmedInput === "\u0004") {
          rl.close();
          log(`Using default model: ${DEFAULT_MODELS.OLLAMA}`, "yellow");
          resolve(DEFAULT_MODELS.OLLAMA);
          return;
        }

        // Check for direct selection (number) - relative to virtual window
        const selection = parseInt(trimmedInput);
        if (
          !isNaN(selection) &&
          selection > 0 &&
          selection <=
            Math.min(VIRTUAL_WINDOW_SIZE, filteredModels.length - virtualOffset)
        ) {
          const selectedModel = filteredModels[virtualOffset + selection - 1];
          rl.close();
          log(`Selected model: ${selectedModel.name}`, "yellow");
          resolve(selectedModel.name);
          return;
        }

        // Check for empty input (Enter key) - select first model in filtered list
        if (trimmedInput === "") {
          if (filteredModels.length > 0) {
            const selectedModel = filteredModels[0]; // Always select first model of entire list
            rl.close();
            log(`Selected model: ${selectedModel.name}`, "yellow");
            resolve(selectedModel.name);
            return;
          }
        }

        // Update filter
        currentFilter = trimmedInput;

        if (currentFilter === "") {
          filteredModels = sortedModels.slice(0, 50); // Show first 50 when no filter
          virtualOffset = 0; // Reset to top when no filter
        } else {
          filteredModels = sortedModels
            .filter((model) => model.name.toLowerCase().includes(currentFilter))
            .slice(0, 50); // Limit to 50 results for performance

          // Find default model in filtered results and adjust offset
          const defaultIndex = filteredModels.findIndex(
            (model) => model.name === defaultModel,
          );
          if (defaultIndex >= 0) {
            // Calculate offset to show default model in first window
            virtualOffset = Math.max(0, defaultIndex - VIRTUAL_WINDOW_SIZE + 1);
          } else {
            virtualOffset = 0; // Reset to top if default not in results
          }
        }

        // Allow single character searches
        if (currentFilter.length === 1 && filteredModels.length === 0) {
          // If single char and no results, show all models for better UX
          filteredModels = sortedModels.slice(0, 50);
          virtualOffset = 0;
        }

        // Redisplay with new filter
        displayModels(filteredModels, true, defaultModel);
      });

      rl.on("close", () => {
        if (!rl.closed) {
          rl.closed = true;
        }
      });
    });
  } catch (error) {
    log(`Error fetching models: ${error.message}`, "red");
    log("Using default model: minimax-m2.5:cloud", "yellow");
    return "minimax-m2.5:cloud";
  }
}

/**
 * Launch Claude Code with Ollama settings
 */
async function launchOllama(
  showModelMenu = false,
  extraArgs = [],
  directModel = null,
) {
  const envVars = loadEnvFile();
  log(`Loading environment from: ${envVars.envFile}`, "yellow");

  let authToken = envVars.OLLAMA_AUTH_TOKEN;

  // Ollama auth token is optional for local use, but prompt if user wants to set it
  if (!authToken) {
    log("Ollama auth token not found (optional for local use)", "yellow");
    log("Press Enter to skip, or provide an auth token:", "reset");
    authToken = await promptForApiKey("Ollama (optional)", "OLLAMA_AUTH_TOKEN");
    if (authToken) {
      updateConfigFile("OLLAMA_AUTH_TOKEN", authToken, null);
      envVars.OLLAMA_AUTH_TOKEN = authToken;
    }
  }

  let selectedModel = envVars.OLLAMA_MODEL || DEFAULT_MODELS.OLLAMA;

  if (directModel) {
    // Direct model specification - find best match
    log(`Finding best match for model: ${directModel}`, "yellow");
    try {
      const models = await fetchOllamaModels(authToken);
      const matchedModel = findBestMatchingModel(directModel, models);
      if (matchedModel) {
        selectedModel = matchedModel;
        log(`Using matched model: ${selectedModel}`, "green");
      } else {
        log(
          `No match found for "${directModel}", using default: ${selectedModel}`,
          "yellow",
        );
      }
    } catch (error) {
      log(`Error fetching models for matching: ${error.message}`, "red");
      log(`Using default model: ${selectedModel}`, "yellow");
    }
  } else if (showModelMenu) {
    selectedModel = await showModelSelection();
  }

  log("Using:", "yellow");
  log(`  Base URL: http://localhost:11434`, "reset");
  log(`  Model: ${selectedModel}`, "reset");
  log("", "reset");

  // Set environment variables for Ollama
  const env = { ...process.env };
  env.ANTHROPIC_BASE_URL = "http://localhost:11434";
  env.ANTHROPIC_AUTH_TOKEN = envVars.OLLAMA_AUTH_TOKEN || "ollama"; // Use "ollama" as default
  env.ANTHROPIC_API_KEY = ""; // Empty for Ollama
  env.ANTHROPIC_MODEL = selectedModel;
  env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC =
    envVars.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC || "1";

  // Update OLLAMA_API_KEY to be empty (as requested)
  env.OLLAMA_API_KEY = "";

  // Launch Claude Code
  const claude = spawn("claude", extraArgs, {
    env,
    stdio: "inherit",
  });

  claude.on("error", (error) => {
    log(`Error launching Claude Code: ${error.message}`, "red");
    process.exit(1);
  });

  claude.on("exit", (code) => {
    process.exit(code);
  });
}

module.exports = {
  launchOllama,
  showModelSelection,
};
