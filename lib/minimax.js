/**
 * Minimax provider implementation
 */

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
const {
  MINIMAX,
  CACHE,
  HTTP_STATUS,
  DEFAULT_MODELS,
  ENV_VARS,
  DEFAULT_VALUES,
} = require("./constants");
const {
  NetworkError,
  ValidationError,
  AuthenticationError,
} = require("./errors");
const { validateAuthToken, validateModelResponse } = require("./validation");

/**
 * Static list of Minimax models (no API discovery available)
 */
function getMinimaxModels() {
  return [
    {
      id: "minimax-m2.7",
      object: "model",
      created: Date.now(),
      owned_by: "minimax",
      pricing: {
        prompt: "0.3",
        completion: "1.2",
      },
    },
    {
      id: "minimax-m2.5",
      object: "model",
      created: Date.now(),
      owned_by: "minimax",
      pricing: {
        prompt: "0.3",
        completion: "1.2",
      },
    },
    {
      id: "minimax-m2.1",
      object: "model",
      created: Date.now(),
      owned_by: "minimax",
      pricing: {
        prompt: "0.3",
        completion: "1.2",
      },
    },
    {
      id: "minimax-m2",
      object: "model",
      created: Date.now(),
      owned_by: "minimax",
      pricing: {
        prompt: "0.3",
        completion: "1.2",
      },
    },
  ];
}

/**
 * Fetch available models from Minimax (static list with caching)
 */
function fetchMinimaxModels(apiKey = null) {
  return new Promise((resolve, reject) => {
    const cachedModels = modelCache.get(CACHE.KEYS.MINIMAX_MODELS);
    if (cachedModels) {
      resolve(cachedModels);
      return;
    }

    // For Minimax, we use static models - no API discovery
    try {
      const staticModels = getMinimaxModels();

      // Cache the static models
      modelCache.set(CACHE.KEYS.MINIMAX_MODELS, staticModels);

      resolve(staticModels);
    } catch (error) {
      log(`Error getting Minimax models: ${error.message}`, "red");
      reject(new NetworkError("Failed to get Minimax models", "minimax"));
    }
  });
}

/**
 * Show interactive model selection for Minimax
 */
async function showModelSelection() {
  const { loadEnvFile } = require("./config");
  const envVars = loadEnvFile();

  try {
    const models = await fetchMinimaxModels(
      validateAuthToken(envVars[ENV_VARS.MINIMAX_AUTH_TOKEN]),
    );

    if (!models || models.length === 0) {
      log("No models available for Minimax", "yellow");
      return DEFAULT_MODELS.MINIMAX;
    }

    // Get default model for this provider
    const { getProviderDefaultModel } = require("./config");
    const defaultModel = getProviderDefaultModel("minimax");

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

    const readline = require("readline");
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    // Display models
    log("Available Minimax models:", "yellow");
    log("", "reset");
    sortedModels.forEach((model, index) => {
      const pricing = model.pricing
        ? ` (prompt: $${model.pricing.prompt}/M, completion: $${model.pricing.completion}/M)`
        : "";
      const isDefault = model.id === defaultModel;
      const defaultText = isDefault ? " [DEFAULT]" : "";
      const color = isDefault ? "green" : "reset";
      log(`  ${index + 1}) ${model.id}${pricing}${defaultText}`, color);
    });
    log("", "reset");

    return new Promise((resolve) => {
      rl.question("Select a model (enter number or model name): ", (answer) => {
        try {
          const trimmedAnswer = answer.trim();
          if (!trimmedAnswer) {
            return resolve(defaultModel);
          }

          // Try to parse as number
          const modelIndex = parseInt(trimmedAnswer) - 1;
          if (
            !isNaN(modelIndex) &&
            modelIndex >= 0 &&
            modelIndex < sortedModels.length
          ) {
            return resolve(sortedModels[modelIndex].id);
          }

          // Try to find by name
          const matchedModel = findBestMatchingModel(
            trimmedAnswer,
            sortedModels,
          );
          if (matchedModel) {
            return resolve(matchedModel);
          }

          log(
            `Invalid selection. Using default model: ${defaultModel}`,
            "yellow",
          );
          return resolve(defaultModel);
        } finally {
          rl.close(); // Always close the readline interface
        }
      });
    });
  } catch (error) {
    log(`Error showing model selection: ${error.message}`, "red");
    return DEFAULT_MODELS.MINIMAX;
  }
}

/**
 * Launch Claude Code with Minimax settings
 */
async function launchMinimax(
  showModelMenu = false,
  extraArgs = [],
  directModel = null,
) {
  const envVars = loadEnvFile();
  log(`Loading environment from: ${envVars.envFile}`, "yellow");

  if (!envVars[ENV_VARS.MINIMAX_AUTH_TOKEN]) {
    log(
      "Minimax API key not found. Please set " +
        ENV_VARS.MINIMAX_AUTH_TOKEN +
        " in your .env file.",
      "yellow",
    );
    const newApiKey = await promptForApiKey(
      "Minimax",
      ENV_VARS.MINIMAX_AUTH_TOKEN,
    );
    if (!newApiKey) {
      log("Error: Minimax auth token is required", "red");
      process.exit(1);
    }
    updateConfigFile(ENV_VARS.MINIMAX_AUTH_TOKEN, newApiKey, null);
    envVars[ENV_VARS.MINIMAX_AUTH_TOKEN] = newApiKey;
  }

  let selectedModel = envVars[ENV_VARS.MINIMAX_MODEL] || DEFAULT_MODELS.MINIMAX;

  if (directModel) {
    // Direct model specification - find best match
    log(`Finding best match for model: ${directModel}`, "yellow");
    try {
      const models = await fetchMinimaxModels(
        envVars[ENV_VARS.MINIMAX_AUTH_TOKEN],
      );
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
  log(`  Base URL: https://api.minimax.io/anthropic`, "reset");
  log(`  Model: ${selectedModel}`, "reset");
  log("", "reset");

  // Set environment variables
  const env = { ...process.env };
  env.ANTHROPIC_BASE_URL = "https://api.minimax.io/anthropic";
  env.ANTHROPIC_API_KEY = ""; // Empty for Minimax
  env.ANTHROPIC_AUTH_TOKEN = envVars[ENV_VARS.MINIMAX_AUTH_TOKEN];
  env.ANTHROPIC_MODEL = selectedModel;
  env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC =
    envVars[ENV_VARS.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC] ||
    DEFAULT_VALUES.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC;

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
  fetchMinimaxModels,
  showModelSelection,
  launchMinimax,
};
