/**
 * OpenRouter provider implementation
 */

const https = require("https");
const { spawnClaude } = require("./claude-spawn");
const {
  log,
  loadEnvFile,
  findBestMatchingModel,
  promptForApiKey,
  updateConfigFile,
  getProviderDefaultModel,
} = require("./config");
const { modelCache } = require("./cache");
const {
  OPENROUTER,
  DEFAULT_MODELS,
  ENV_VARS,
  DEFAULT_VALUES,
  getProviderBaseUrl,
} = require("./constants");
const {
  NetworkError,
  AuthenticationError,
} = require("./errors");
const { validateAuthToken, validateModelResponse } = require("./validation");
const { showModelSelection: showModelSelectionTUI } = require("./show-model-selection");

/**
 * Fetch available models from OpenRouter API with caching
 */
function fetchOpenRouterModels(apiKey = null) {
  return new Promise((resolve, reject) => {
    const cachedModels = modelCache.get("openrouter-models");
    if (cachedModels) {
      resolve(cachedModels);
      return;
    }

    if (!apiKey) {
      const envVars = loadEnvFile();
      apiKey = validateAuthToken(envVars[ENV_VARS.OPENROUTER_AUTH_TOKEN]);
    }

    if (!apiKey) {
      reject(
        new AuthenticationError("OpenRouter API key is required", "openrouter"),
      );
      return;
    }

    const options = {
      hostname: OPENROUTER.host,
      port: OPENROUTER.port,
      path: OPENROUTER.apiPath,
      method: "GET",
      headers: {
        Authorization: `${OPENROUTER.authHeader} ${apiKey}`,
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
          const models = validateModelResponse(response.data || response);

          modelCache.set("openrouter-models", models);

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

    req.setTimeout(OPENROUTER.timeout, () => {
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
 * Format pricing metadata for OpenRouter models.
 */
function formatOpenRouterMeta(model) {
  if (!model.pricing) return "";
  const promptPrice = model.pricing.prompt
    ? "$" + (parseFloat(model.pricing.prompt) * 1000000).toFixed(2) + "/M"
    : "free";
  const completionPrice = model.pricing.completion
    ? "$" + (parseFloat(model.pricing.completion) * 1000000).toFixed(2) + "/M"
    : "free";

  if (promptPrice === "free" && completionPrice === "free") {
    return " (free)";
  } else if (promptPrice === completionPrice) {
    return ` (${promptPrice})`;
  } else {
    return ` (in: ${promptPrice}, out: ${completionPrice})`;
  }
}

/**
 * Show interactive model selection for OpenRouter
 */
async function showModelSelection() {
  const envVars = loadEnvFile();
  let apiKey = validateAuthToken(envVars[ENV_VARS.OPENROUTER_AUTH_TOKEN]);

  if (!apiKey) {
    log(
      "OpenRouter API key not found. Please set " +
        ENV_VARS.OPENROUTER_AUTH_TOKEN +
        " in your environment file.",
      "red",
    );
    const newApiKey = await promptForApiKey(
      "OpenRouter",
      ENV_VARS.OPENROUTER_AUTH_TOKEN,
    );
    if (!newApiKey) {
      log("OpenRouter API key is required for model selection", "red");
      process.exit(1);
    }
    updateConfigFile(ENV_VARS.OPENROUTER_AUTH_TOKEN, newApiKey, null);
    apiKey = newApiKey;
  }

  log("Fetching available models from OpenRouter...", "yellow");

  try {
    const models = await fetchOpenRouterModels(apiKey);

    const defaultModel = getProviderDefaultModel("openrouter");

    // Sort models to put default model first
    const sortedModels = [...models];
    const defaultIndex = sortedModels.findIndex(
      (model) => model.id === defaultModel,
    );
    if (defaultIndex > 0) {
      const [defaultModelObj] = sortedModels.splice(defaultIndex, 1);
      sortedModels.unshift(defaultModelObj);
    }

    return showModelSelectionTUI(sortedModels, defaultModel, {
      displayField: "id",
      metadataFormatter: formatOpenRouterMeta,
      providerName: "OpenRouter",
      defaultModelConstant: DEFAULT_MODELS.OPENROUTER,
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
  const envVars = loadEnvFile();
  log(`Loading environment from: ${envVars.envFile}`, "yellow");

  if (!envVars[ENV_VARS.OPENROUTER_AUTH_TOKEN]) {
    log("OpenRouter auth token not found. Please provide it:", "yellow");
    const authToken = await promptForApiKey(
      "OpenRouter",
      ENV_VARS.OPENROUTER_AUTH_TOKEN,
    );
    if (!authToken) {
      log("Error: OpenRouter auth token is required", "red");
      process.exit(1);
    }
    updateConfigFile(ENV_VARS.OPENROUTER_AUTH_TOKEN, authToken, null);
    envVars[ENV_VARS.OPENROUTER_AUTH_TOKEN] = authToken;
  }

  let selectedModel =
    envVars[ENV_VARS.OPENROUTER_MODEL] || DEFAULT_MODELS.OPENROUTER;

  if (directModel) {
    log(`Finding best match for model: ${directModel}`, "yellow");
    try {
      const models = await fetchOpenRouterModels(
        envVars[ENV_VARS.OPENROUTER_AUTH_TOKEN],
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
  log(`  Base URL: ${getProviderBaseUrl("openrouter")}`, "reset");
  log(`  Model: ${selectedModel}`, "reset");
  log("", "reset");

  const env = { ...process.env };
  env.ANTHROPIC_BASE_URL = getProviderBaseUrl("openrouter");
  env.ANTHROPIC_API_KEY = ""; // Empty for OpenRouter
  env.ANTHROPIC_AUTH_TOKEN = envVars[ENV_VARS.OPENROUTER_AUTH_TOKEN];
  env.ANTHROPIC_MODEL = selectedModel;
  env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC =
    envVars[ENV_VARS.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC] ||
    DEFAULT_VALUES.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC;

  const claude = spawnClaude(extraArgs, {
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
