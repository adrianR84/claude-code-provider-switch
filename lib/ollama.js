/**
 * Ollama provider implementation
 */

const http = require("http");
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
  OLLAMA,
  DEFAULT_MODELS,
  ENV_VARS,
  DEFAULT_VALUES,
  getProviderBaseUrl,
} = require("./constants");
const { NetworkError } = require("./errors");
const { validateAuthToken } = require("./validation");
const { showModelSelection: showModelSelectionTUI } = require("./show-model-selection");

/**
 * Fetch available models from Ollama API with caching
 */
function fetchOllamaModels(authToken = null) {
  return new Promise((resolve, reject) => {
    const cachedModels = modelCache.get("ollama-models");
    if (cachedModels && Array.isArray(cachedModels)) {
      resolve(cachedModels);
      return;
    }

    if (cachedModels && !Array.isArray(cachedModels)) {
      modelCache.clear("ollama-models");
    }

    const options = {
      hostname: OLLAMA.host,
      port: OLLAMA.port,
      path: OLLAMA.apiPath,
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(authToken && {
          Authorization: `${OLLAMA.authHeader} ${authToken}`,
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
          const models = response.models || response.data || response;

          modelCache.set("ollama-models", models);

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

    req.setTimeout(OLLAMA.timeout, () => {
      req.destroy();
      reject(new Error("Request timeout - failed to fetch models from Ollama"));
    });

    req.end();
  });
}

/**
 * Format size metadata for Ollama models.
 */
function formatOllamaMeta(model) {
  return model.size ? ` (${model.size})` : "";
}

/**
 * Show interactive model selection for Ollama
 */
async function showModelSelection() {
  const envVars = loadEnvFile();
  let authToken = envVars && envVars[ENV_VARS.OLLAMA_AUTH_TOKEN];

  if (!authToken) {
    log(
      "Ollama API key not found. Please set " +
        ENV_VARS.OLLAMA_AUTH_TOKEN +
        " in your environment file.",
      "red",
    );
    const newApiKey = await promptForApiKey(
      "Ollama",
      ENV_VARS.OLLAMA_AUTH_TOKEN,
    );
    if (!newApiKey) {
      log("Ollama auth token is required for model selection", "red");
      process.exit(1);
    }
    updateConfigFile(ENV_VARS.OLLAMA_AUTH_TOKEN, newApiKey, null);
    authToken = newApiKey;
  }

  log("Fetching available models from Ollama...", "yellow");

  try {
    const models = await fetchOllamaModels(authToken);

    const defaultModel = getProviderDefaultModel("ollama");

    const sortedModels = [...models];
    const defaultIndex = sortedModels.findIndex(
      (model) => model.name === defaultModel,
    );
    if (defaultIndex > 0) {
      const [defaultModelObj] = sortedModels.splice(defaultIndex, 1);
      sortedModels.unshift(defaultModelObj);
    }

    return showModelSelectionTUI(sortedModels, defaultModel, {
      displayField: "name",
      metadataFormatter: formatOllamaMeta,
      providerName: "Ollama",
      defaultModelConstant: DEFAULT_MODELS.OLLAMA,
    });
  } catch (error) {
    log(`Error fetching models: ${error.message}`, "red");
    log(`Using default model: ${DEFAULT_MODELS.OLLAMA}`, "yellow");
    return DEFAULT_MODELS.OLLAMA;
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

  let authToken = envVars && envVars[ENV_VARS.OLLAMA_AUTH_TOKEN];

  if (!authToken) {
    log("Ollama auth token not found (optional for local use)", "yellow");
    log("Press Enter to skip, or provide an auth token:", "reset");
    const apiKey = validateAuthToken(
      envVars && envVars[ENV_VARS.OLLAMA_AUTH_TOKEN],
    );
    authToken = await promptForApiKey(
      "Ollama (optional)",
      ENV_VARS.OLLAMA_AUTH_TOKEN,
    );
    if (authToken) {
      updateConfigFile(ENV_VARS.OLLAMA_AUTH_TOKEN, apiKey, null);
      envVars[ENV_VARS.OLLAMA_AUTH_TOKEN] = apiKey;
    }
  }

  let selectedModel = envVars[ENV_VARS.OLLAMA_MODEL] || DEFAULT_MODELS.OLLAMA;

  if (directModel) {
    log(`Finding best match for model: ${directModel}`, "yellow");
    try {
      const models = await fetchOllamaModels(
        envVars[ENV_VARS.OLLAMA_AUTH_TOKEN],
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
  log(`  Base URL: ${getProviderBaseUrl("ollama")}`, "reset");
  log(`  Model: ${selectedModel}`, "reset");
  log("", "reset");

  const env = { ...process.env };
  env.ANTHROPIC_BASE_URL = getProviderBaseUrl("ollama");
  env.ANTHROPIC_AUTH_TOKEN = envVars[ENV_VARS.OLLAMA_AUTH_TOKEN] || "ollama";
  env.ANTHROPIC_API_KEY = "";
  env.ANTHROPIC_MODEL = selectedModel;
  env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC =
    envVars[ENV_VARS.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC] ||
    DEFAULT_VALUES.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC;

  env.OLLAMA_API_KEY = "";

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
  launchOllama,
  showModelSelection,
};
