/**
 * Application constants - Compact configuration
 */

// Provider configurations with embedded settings
const PROVIDERS = {
  ollama: {
    host: "localhost",
    port: 11434,
    apiPath: "/api/tags",
    timeout: 5000,
    authHeader: "Bearer",
    defaultModel: "minimax-m2.5:cloud",
    envVars: { auth: "OLLAMA_AUTH_TOKEN", model: "OLLAMA_MODEL" },
  },
  openrouter: {
    host: "openrouter.ai",
    port: 443,
    apiPath: "/api/v1/models",
    timeout: 10000,
    authHeader: "Bearer",
    defaultModel: "openrouter/free",
    envVars: { auth: "OPENROUTER_AUTH_TOKEN", model: "OPENROUTER_MODEL" },
  },
  anthropic: {
    host: "api.anthropic.com",
    port: 443,
    apiPath: "/v1/models",
    timeout: 10000,
    authHeader: "X-Api-Key",
    defaultModel: "claude-3-5-sonnet-latest",
    envVars: { auth: "ANTHROPIC_API_KEY", model: "ANTHROPIC_MODEL" },
  },
  minimax: {
    host: "api.minimax.io",
    port: 443,
    apiPath: "/anthropic/v1/models",
    timeout: 10000,
    authHeader: "Bearer",
    defaultModel: "minimax-m2.7",
    envVars: { auth: "MINIMAX_AUTH_TOKEN", model: "MINIMAX_MODEL" },
  },
};

// System configuration
const CACHE = { ttl: 5 * 60 * 1000, maxSize: 50, maxMemory: 10 * 1024 * 1024 };
const HTTP_STATUS = {
  OK: 200,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  SERVER_ERROR: 500,
};

// Environment variables and defaults
const ENV_VARS = {
  ...Object.fromEntries(
    Object.values(PROVIDERS).flatMap((p) => [
      [p.envVars.auth, p.envVars.auth],
      [p.envVars.model, p.envVars.model],
    ]),
  ),
  DEFAULT_PROVIDER: "DEFAULT_PROVIDER",
  DEFAULT_MODEL: "DEFAULT_MODEL",
  CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC:
    "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC",
};

const DEFAULT_VALUES = { CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1" };
const DEFAULT_MODELS = {
  ...Object.fromEntries(
    Object.keys(PROVIDERS).map((k) => [k, PROVIDERS[k].defaultModel]),
  ),
  ORIGINAL: "original",
};

// Provider aliases
const PROVIDER_ALIASES = {
  openrouter: ["openrouter", "or", "open"],
  anthropic: ["anthropic", "ant"],
  minimax: ["minimax", "min", "mm"],
  ollama: ["ollama", "oll"],
  original: ["original", "orig", "def", "d"],
};

// Helper functions
function getProviderConfig(providerName) {
  return PROVIDERS[providerName];
}

function getProviderEnvVar(providerName, varType) {
  const config = getProviderConfig(providerName);
  return config?.envVars?.[varType] || null;
}

function getAllProviderAliases() {
  return Object.values(PROVIDER_ALIASES).flat();
}

function getProviderIdFromCommand(command) {
  return (
    Object.entries(PROVIDER_ALIASES).find(([_, aliases]) =>
      aliases.includes(command.toLowerCase()),
    )?.[0] || null
  );
}

// Cache keys helper
function getCacheKey(provider) {
  return `${provider}-models`;
}

// Legacy exports for backward compatibility
const OLLAMA = PROVIDERS.ollama;
const OPENROUTER = PROVIDERS.openrouter;
const ANTHROPIC = PROVIDERS.anthropic;
const MINIMAX = PROVIDERS.minimax;

module.exports = {
  // Core configurations
  PROVIDERS,
  CACHE,
  HTTP_STATUS,
  ENV_VARS,
  DEFAULT_VALUES,
  DEFAULT_MODELS,
  PROVIDER_ALIASES,

  // Legacy exports
  OLLAMA,
  OPENROUTER,
  ANTHROPIC,
  MINIMAX,

  // Helper functions
  getProviderConfig,
  getProviderEnvVar,
  getAllProviderAliases,
  getProviderIdFromCommand,
  getCacheKey,
};
