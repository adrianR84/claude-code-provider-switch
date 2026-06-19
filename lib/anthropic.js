/**
 * Anthropic provider implementation
 */

const https = require("https");
const { spawnClaude } = require("./claude-spawn");
const {
  log,
  loadEnvFile,
  promptForApiKey,
  updateConfigFile,
  findBestMatchingModel,
  getProviderDefaultModel,
} = require("./config");
const { modelCache } = require("./cache");
const {
  ANTHROPIC,
  HTTP_STATUS,
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
 * Fetch available models from Anthropic API with caching
 */
function fetchAnthropicModels(apiKey = null) {
  return new Promise((resolve, reject) => {
    const cachedModels = modelCache.get("anthropic-models");
    if (cachedModels) {
      resolve(cachedModels);
      return;
    }

    if (!apiKey) {
      const envVars = loadEnvFile();
      apiKey = validateAuthToken(envVars[ENV_VARS.ANTHROPIC_API_KEY]);
    }

    if (!apiKey) {
      reject(
        new AuthenticationError("Anthropic API key is required", "anthropic"),
      );
      return;
    }

    const options = {
      hostname: ANTHROPIC.host,
      port: ANTHROPIC.port,
      path: ANTHROPIC.apiPath,
      method: "GET",
      headers: {
        [`${ANTHROPIC.authHeader}`]: apiKey,
        "anthropic-version": "2023-06-01",
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
          if (res.statusCode !== HTTP_STATUS.OK) {
            if (
              res.statusCode === HTTP_STATUS.UNAUTHORIZED ||
              res.statusCode === HTTP_STATUS.FORBIDDEN
            ) {
              reject(
                new AuthenticationError(
                  `Authentication failed: ${res.statusCode}`,
                  "anthropic",
                ),
              );
              return;
            }
            reject(
              new NetworkError(
                `HTTP ${res.statusCode}: ${res.statusMessage}`,
                "anthropic",
                res.statusCode,
              ),
            );
            return;
          }

          const response = JSON.parse(data);
          const models = validateModelResponse(response.data || response);

          modelCache.set("anthropic-models", models);

          resolve(models);
        } catch (error) {
          reject(
            new NetworkError(
              `Failed to parse Anthropic API response: ${error.message}`,
              "anthropic",
            ),
          );
        }
      });
    });

    req.on("error", (error) => {
      reject(
        new NetworkError(
          `Failed to fetch Anthropic models: ${error.message}`,
          "anthropic",
        ),
      );
    });

    req.setTimeout(ANTHROPIC.timeout, () => {
      req.destroy();
      reject(
        new NetworkError(
          "Request timeout - failed to fetch models from Anthropic",
          "anthropic",
        ),
      );
    });

    req.end();
  });
}

/**
 * Format max_tokens metadata for Anthropic models.
 */
function formatAnthropicMeta(model) {
  return model.max_tokens ? ` (${model.max_tokens}K)` : "";
}

/**
 * Show interactive model selection for Anthropic
 */
async function showModelSelection() {
  const envVars = loadEnvFile();
  let apiKey = validateAuthToken(envVars[ENV_VARS.ANTHROPIC_API_KEY]);

  if (!apiKey) {
    log(
      "Anthropic API key not found. Please set " +
        ENV_VARS.ANTHROPIC_API_KEY +
        " in your environment file.",
      "red",
    );
    const newApiKey = await promptForApiKey(
      "Anthropic",
      ENV_VARS.ANTHROPIC_API_KEY,
    );
    if (!newApiKey) {
      log("Anthropic API key is required for model selection", "red");
      process.exit(1);
    }
    updateConfigFile(ENV_VARS.ANTHROPIC_API_KEY, newApiKey, null);
    apiKey = newApiKey;
  }

  log("Fetching available models from Anthropic...", "yellow");

  try {
    const models = await fetchAnthropicModels(apiKey);

    const defaultModel = getProviderDefaultModel("anthropic");

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
      metadataFormatter: formatAnthropicMeta,
      providerName: "Anthropic",
      defaultModelConstant: DEFAULT_MODELS.ANTHROPIC,
    });
  } catch (error) {
    log(`Error fetching models: ${error.message}`, "red");
    log(`Using default model: ${DEFAULT_MODELS.ANTHROPIC}`, "yellow");
    return DEFAULT_MODELS.ANTHROPIC;
  }
}

/**
 * Launch Claude Code with Anthropic settings
 */
async function launchAnthropic(
  showModelMenu = false,
  extraArgs = [],
  directModel = null,
) {
  const envVars = loadEnvFile();
  log(`Loading environment from: ${envVars.envFile}`, "yellow");

  if (!envVars[ENV_VARS.ANTHROPIC_API_KEY]) {
    log("Anthropic API key not found. Please provide it:", "yellow");
    const apiKey = await promptForApiKey(
      "Anthropic",
      ENV_VARS.ANTHROPIC_API_KEY,
    );
    if (!apiKey) {
      log("Error: Anthropic API key is required", "red");
      process.exit(1);
    }
    updateConfigFile(ENV_VARS.ANTHROPIC_API_KEY, apiKey, null);
    envVars[ENV_VARS.ANTHROPIC_API_KEY] = apiKey;
  }

  let selectedModel =
    envVars[ENV_VARS.ANTHROPIC_MODEL] || DEFAULT_MODELS.ANTHROPIC;

  if (directModel) {
    log(`Finding best match for model: ${directModel}`, "yellow");
    try {
      const models = await fetchAnthropicModels(
        envVars[ENV_VARS.ANTHROPIC_API_KEY],
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
  log(`  Model: ${selectedModel}`, "reset");
  log("", "reset");

  const env = { ...process.env };
  env.ANTHROPIC_BASE_URL = getProviderBaseUrl("anthropic");
  env.ANTHROPIC_API_KEY = ""; // Empty for Anthropic (uses AUTH_TOKEN instead)
  env.ANTHROPIC_AUTH_TOKEN = envVars[ENV_VARS.ANTHROPIC_API_KEY];
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
  launchAnthropic,
  showModelSelection,
};
