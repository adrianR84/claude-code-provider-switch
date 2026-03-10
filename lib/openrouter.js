/**
 * OpenRouter provider implementation
 */

const https = require("https");
const { spawn } = require("child_process");
const {
  log,
  loadEnvFile,
  promptForApiKey,
  updateEnvFile,
  envFile,
  findBestMatchingModel,
} = require("./config");

/**
 * Fetch available models from OpenRouter API
 */
function fetchOpenRouterModels(apiKey) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "openrouter.ai",
      port: 443,
      path: "/api/v1/models",
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
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
          if (response.data && Array.isArray(response.data)) {
            resolve(response.data);
          } else {
            reject(new Error("Invalid response format from OpenRouter API"));
          }
        } catch (error) {
          reject(new Error(`Failed to parse API response: ${error.message}`));
        }
      });
    });

    req.on("error", (error) => {
      reject(new Error(`Failed to fetch models: ${error.message}`));
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(
        new Error("Request timeout - failed to fetch models from OpenRouter"),
      );
    });

    req.end();
  });
}

/**
 * Show interactive model selection for OpenRouter
 */
async function showModelSelection(apiKey) {
  log("Fetching available models from OpenRouter...", "yellow");

  try {
    const models = await fetchOpenRouterModels(apiKey);
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

    function displayModels(modelList, showHeader = true) {
      if (showHeader) {
        // Clear screen and show header
        console.clear();
        log(
          `Found ${models.length} models. Start typing to filter, or press Enter to select.`,
          "green",
        );
        log('Type "exit" to cancel and use default model.', "yellow");
        log("", "reset");
      }

      if (modelList.length === 0) {
        log("No models match your search.", "red");
        log("", "reset");
        return;
      }

      // Display filtered models (max 20 at a time)
      const displayModels = modelList.slice(0, 20);
      displayModels.forEach((model, index) => {
        const pricing = model.pricing
          ? ` (${model.pricing.prompt ? "$" + parseFloat(model.pricing.prompt).toFixed(6) + "/1K" : "free"})`
          : "";
        log(`${index + 1}) ${model.id}${pricing}`, "reset");
      });

      if (modelList.length > 20) {
        log("", "reset");
        log(
          `... and ${modelList.length - 20} more models matching your filter`,
          "yellow",
        );
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
      // Initial display
      displayModels(filteredModels);

      // Add input debouncing to prevent duplicate characters
      let inputTimeout = null;
      let lastInputTime = 0;

      rl.on("line", (input) => {
        const trimmedInput = input.trim().toLowerCase();
        const currentTime = Date.now();

        // Debounce: ignore rapid successive inputs within 100ms
        if (currentTime - lastInputTime < 100) {
          return; // Skip this input
        }
        lastInputTime = currentTime;

        // Check for exit command
        if (trimmedInput === "exit") {
          rl.close();
          log("Using default model: openrouter/free", "yellow");
          resolve("openrouter/free");
          return;
        }

        // Check for direct selection (number)
        const selection = parseInt(trimmedInput);
        if (
          !isNaN(selection) &&
          selection > 0 &&
          selection <= Math.min(filteredModels.length, 20)
        ) {
          const selectedModel = filteredModels[selection - 1];
          rl.close();
          log(`Selected model: ${selectedModel.id}`, "yellow");
          resolve(selectedModel.id);
          return;
        }

        // Update filter
        currentFilter = trimmedInput;

        if (currentFilter === "") {
          filteredModels = models.slice(0, 50); // Show first 50 when no filter
        } else {
          filteredModels = models
            .filter((model) => model.id.toLowerCase().includes(currentFilter))
            .slice(0, 50); // Limit to 50 results for performance
        }

        // Redisplay with new filter
        displayModels(filteredModels);
      });

      rl.on("close", () => {
        if (!rl.closed) {
          rl.closed = true;
        }
      });
    });
  } catch (error) {
    log(`Error fetching models: ${error.message}`, "red");
    log("Using default model: openrouter/free", "yellow");
    return "openrouter/free";
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
  log(`Loading environment from: ${envFile}`, "yellow");

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

  let selectedModel = envVars.OPENROUTER_MODEL || "openrouter/free";

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
    selectedModel = await showModelSelection(envVars.OPENROUTER_AUTH_TOKEN);
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
