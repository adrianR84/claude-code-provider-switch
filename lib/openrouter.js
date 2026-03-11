/**
 * OpenRouter provider implementation
 */

const https = require("https");
const { spawn } = require("child_process");
const {
  log,
  loadEnvFile,
  findBestMatchingModel,
  promptForApiKey,
  updateEnvFile,
} = require("./config");
const { modelCache } = require("./cache");
const {
  OPENROUTER,
  CACHE,
  HTTP_STATUS,
  DEFAULT_MODELS,
} = require("./constants");
const {
  NetworkError,
  ValidationError,
  AuthenticationError,
} = require("./errors");
const { validateAuthToken, validateModelResponse } = require("./validation");

/**
 * Fetch available models from OpenRouter API with caching
 */
function fetchOpenRouterModels(apiKey = null) {
  return new Promise((resolve, reject) => {
    const cachedModels = modelCache.get(CACHE.KEYS.OPENROUTER_MODELS);
    if (cachedModels) {
      resolve(cachedModels);
      return;
    }

    // If no API key provided, try to get from environment
    if (!apiKey) {
      const envVars = loadEnvFile();
      apiKey = validateAuthToken(envVars.OPENROUTER_AUTH_TOKEN);
    }

    if (!apiKey) {
      reject(
        new AuthenticationError("OpenRouter API key is required", "openrouter"),
      );
      return;
    }

    const options = {
      hostname: OPENROUTER.DEFAULT_HOST,
      port: OPENROUTER.DEFAULT_PORT,
      path: OPENROUTER.API_PATH,
      method: "GET",
      headers: {
        Authorization: `${OPENROUTER.AUTH_HEADER} ${apiKey}`,
        "Content-Type": "application/json",
      },
    };

    const req = https.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        try {
          const response = JSON.parse(data);
          const models = validateModelResponse(response.data || response); // Handle both data and direct array

          // Cache the response
          modelCache.set(CACHE.KEYS.OPENROUTER_MODELS, models);

          resolve(models);
        } catch (error) {
          reject(
            new NetworkError(
              `Failed to parse OpenRouter API response: ${error.message}`,
              "openrouter",
            ),
          );
        }
      });
    });

    req.on("error", (error) => {
      reject(
        new NetworkError(
          `Failed to fetch OpenRouter models: ${error.message}`,
          "openrouter",
        ),
      );
    });

    req.setTimeout(OPENROUTER.TIMEOUT, () => {
      reject(
        new NetworkError(
          "Request timeout - failed to fetch models from OpenRouter",
          "openrouter",
        ),
      );
    });

    req.end();
  });
}

/**
 * Show interactive model selection for OpenRouter
 */
async function showModelSelection() {
  const envVars = loadEnvFile();
  let apiKey = validateAuthToken(envVars.OPENROUTER_AUTH_TOKEN);

  if (!apiKey) {
    log(
      "OpenRouter API key not found. Please set OPENROUTER_AUTH_TOKEN in your .env file.",
      "red",
    );
    const newApiKey = await promptForApiKey(
      "OpenRouter",
      "OPENROUTER_AUTH_TOKEN",
    );
    if (!newApiKey) {
      log("OpenRouter API key is required for model selection", "red");
      process.exit(1);
    }
    updateEnvFile("OPENROUTER_AUTH_TOKEN", newApiKey);
    apiKey = newApiKey;
  }

  log("Fetching available models from OpenRouter...", "yellow");

  try {
    const models = await fetchOpenRouterModels(apiKey);

    // Get default model for this provider
    const { getProviderDefaultModel } = require("./config");
    const defaultModel = getProviderDefaultModel("openrouter");

    // Sort models to put default model first
    const sortedModels = [...models];
    const defaultIndex = sortedModels.findIndex(
      (model) => model.id === defaultModel,
    );
    if (defaultIndex > 0) {
      // Move default model to beginning
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
    let filteredModels = models.slice(0, 50); // Start with first 50 models

    // Virtual scrolling state
    let virtualOffset = 0;
    const VIRTUAL_WINDOW_SIZE = 20;

    // Debouncing state
    let inputTimeout = null;
    const DEBOUNCE_DELAY = 300;

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
        const pricing = model.pricing
          ? ` (${model.pricing.prompt ? "$" + (parseFloat(model.pricing.prompt) * 1000000).toFixed(2) + "/M" : "free"})`
          : "";
        const isDefault = defaultModel && model.id === defaultModel;
        const defaultText = isDefault ? " [DEFAULT]" : "";
        const color = isDefault ? "green" : "reset";
        const actualIndex = virtualOffset + index + 1;
        log(`${actualIndex}) ${model.id}${pricing}${defaultText}`, color);
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
    readline.emitKeypressEvents(process.stdin);
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
        (model) => model.id === defaultModel,
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
          log(`Using default model: ${DEFAULT_MODELS.OPENROUTER}`, "yellow");
          resolve(DEFAULT_MODELS.OPENROUTER);
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
          log(`Using default model: ${DEFAULT_MODELS.OPENROUTER}`, "yellow");
          resolve(DEFAULT_MODELS.OPENROUTER);
          return;
        }

        // Special quit command (Ctrl+C or Ctrl+D) - only exit at main prompt
        if (trimmedInput === "\u0003" || trimmedInput === "\u0004") {
          rl.close();
          log(`Using default model: ${DEFAULT_MODELS.OPENROUTER}`, "yellow");
          resolve(DEFAULT_MODELS.OPENROUTER);
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
          log(`Selected model: ${selectedModel.id}`, "yellow");
          resolve(selectedModel.id);
          return;
        }

        // Check for empty input (Enter key) - select first model in filtered list
        if (trimmedInput === "") {
          if (filteredModels.length > 0) {
            const selectedModel = filteredModels[0]; // Always select first model of entire list
            rl.close();
            log(`Selected model: ${selectedModel.id}`, "yellow");
            resolve(selectedModel.id);
            return;
          }
        }

        // Clear existing timeout
        if (inputTimeout) {
          clearTimeout(inputTimeout);
        }

        // Update filter with debouncing
        currentFilter = trimmedInput;

        if (currentFilter === "") {
          filteredModels = models.slice(0, 50); // Show first 50 when no filter
          virtualOffset = 0; // Reset to top when no filter
        } else {
          filteredModels = models
            .filter((model) => model.id.toLowerCase().includes(currentFilter))
            .slice(0, 50); // Limit to 50 results for performance

          // Find default model in filtered results and adjust offset
          const defaultIndex = filteredModels.findIndex(
            (model) => model.id === defaultModel,
          );
          if (defaultIndex >= 0) {
            // Calculate offset to show default model in first window
            virtualOffset = Math.max(0, defaultIndex - VIRTUAL_WINDOW_SIZE + 1);
          } else {
            virtualOffset = 0; // Reset to top if default not in results
          }
        }

        // Set timeout for next input
        inputTimeout = setTimeout(() => {
          displayModels(filteredModels, false, defaultModel);
        }, DEBOUNCE_DELAY);
      });

      rl.on("close", () => {
        if (!rl.closed) {
          rl.closed = true;
        }
      });
    });
  } catch (error) {
    log(`Error fetching models: ${error.message}`, "red");
    log(`Using default model: ${DEFAULT_MODELS.OPENROUTER}`, "yellow");
    return DEFAULT_MODELS.OPENROUTER;
  }
}

/**
 * Launch Claude Code with OpenRouter settings
 */
async function launchOpenRouter(
  showModelMenu = false,
  extraArgs = [],
  directModel = null,
) {
  log("Launching Claude Code with OpenRouter settings...", "green");

  const envVars = loadEnvFile();
  log(`Loading environment from: ${envVars.envFile}`, "yellow");

  if (!envVars.OPENROUTER_AUTH_TOKEN) {
    log("OpenRouter auth token not found. Please provide it:", "yellow");
    const authToken = await promptForApiKey(
      "OpenRouter",
      "OPENROUTER_AUTH_TOKEN",
    );
    if (!authToken) {
      log("Error: OpenRouter auth token is required", "red");
      process.exit(1);
    }
    updateEnvFile("OPENROUTER_AUTH_TOKEN", authToken);
    envVars.OPENROUTER_AUTH_TOKEN = authToken;
  }

  let selectedModel = envVars.OPENROUTER_MODEL || DEFAULT_MODELS.OPENROUTER;

  if (directModel) {
    // Direct model specification - find best match
    log(`Finding best match for model: ${directModel}`, "yellow");
    try {
      const models = await fetchOpenRouterModels(envVars.OPENROUTER_AUTH_TOKEN);
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
  log(`  Base URL: https://openrouter.ai/api`, "reset");
  log(`  Model: ${selectedModel}`, "reset");
  log("", "reset");

  // Set environment variables
  const env = { ...process.env };
  env.ANTHROPIC_BASE_URL = "https://openrouter.ai/api";
  env.ANTHROPIC_API_KEY = ""; // Empty for OpenRouter
  env.ANTHROPIC_AUTH_TOKEN = envVars.OPENROUTER_AUTH_TOKEN;
  env.ANTHROPIC_MODEL = selectedModel;

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
  launchOpenRouter,
  showModelSelection,
};
