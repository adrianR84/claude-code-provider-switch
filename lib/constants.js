/**
 * Application constants - Compact configuration
 */

// Unified provider configuration with embedded aliases
const PROVIDERS = {
  ollama: {
    host: "localhost",
    port: 11434,
    apiPath: "/api/tags",
    baseUrl: "http://localhost:11434",
    timeout: 5000,
    authHeader: "Bearer",
    defaultModel: "llama2", // Fixed: was incorrectly set to minimax model
    envVars: { auth: "OLLAMA_AUTH_TOKEN", model: "OLLAMA_MODEL" },
    aliases: ["ollama", "oll"],
  },
  openrouter: {
    host: "openrouter.ai",
    port: 443,
    apiPath: "/api/v1/models",
    baseUrl: "https://openrouter.ai/api",
    timeout: 10000,
    authHeader: "Bearer",
    defaultModel: "openrouter/free",
    envVars: { auth: "OPENROUTER_AUTH_TOKEN", model: "OPENROUTER_MODEL" },
    aliases: ["openrouter", "or", "open"],
  },
  anthropic: {
    host: "api.anthropic.com",
    port: 443,
    apiPath: "/v1/models",
    baseUrl: "https://api.anthropic.com",
    timeout: 10000,
    authHeader: "X-Api-Key",
    defaultModel: "claude-3-5-sonnet-latest",
    envVars: { auth: "ANTHROPIC_API_KEY", model: "ANTHROPIC_MODEL" },
    aliases: ["anthropic", "ant"],
  },
  minimax: {
    host: "api.minimax.io",
    port: 443,
    apiPath: "/anthropic/v1/models",
    baseUrl: "https://api.minimax.io/anthropic",
    timeout: 10000,
    authHeader: "Bearer",
    defaultModel: "minimax-m2.7",
    envVars: { auth: "MINIMAX_AUTH_TOKEN", model: "MINIMAX_MODEL" },
    aliases: ["minimax", "min", "mm"],
  },
  original: {
    aliases: ["original", "orig", "def", "d"],
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
    Object.values(PROVIDERS)
      .filter((p) => p.envVars)
      .flatMap((p) => Object.values(p.envVars).map((v) => [v, v])),
  ),
  DEFAULT_PROVIDER: "DEFAULT_PROVIDER",
  DEFAULT_MODEL: "DEFAULT_MODEL",
  CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC:
    "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC",
};

const DEFAULT_VALUES = { CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1" };
const DEFAULT_MODELS = {
  ...Object.fromEntries(
    Object.entries(PROVIDERS)
      .filter(([_, config]) => config.defaultModel)
      .map(([k, config]) => [k, config.defaultModel]),
  ),
  ORIGINAL: "original",
};

// Helper functions
function getProviderConfig(providerName) {
  return PROVIDERS[providerName];
}

function getProviderEnvVar(providerName, varType) {
  return PROVIDERS[providerName]?.envVars?.[varType] || null;
}

function getProviderBaseUrl(providerName) {
  return PROVIDERS[providerName]?.baseUrl || null;
}

function getAllProviderAliases() {
  return Object.values(PROVIDERS)
    .filter((config) => config.aliases)
    .flatMap((config) => config.aliases);
}

function getProviderIdFromCommand(command) {
  return (
    Object.entries(PROVIDERS).find(([_, config]) =>
      config.aliases?.includes(command.toLowerCase()),
    )?.[0] || null
  );
}

function getCacheKey(provider) {
  return `${provider}-models`;
}

// Generate PROVIDER_ALIASES for backward compatibility
const PROVIDER_ALIASES = Object.fromEntries(
  Object.entries(PROVIDERS)
    .filter(([_, config]) => config.aliases)
    .map(([key, config]) => [key, config.aliases]),
);

module.exports = {
  PROVIDERS,
  CACHE,
  HTTP_STATUS,
  ENV_VARS,
  DEFAULT_VALUES,
  DEFAULT_MODELS,
  PROVIDER_ALIASES,
  getProviderConfig,
  getProviderEnvVar,
  getProviderBaseUrl,
  getAllProviderAliases,
  getProviderIdFromCommand,
  getCacheKey,

  // Legacy exports (direct references to avoid redundancy)
  OLLAMA: PROVIDERS.ollama,
  OPENROUTER: PROVIDERS.openrouter,
  ANTHROPIC: PROVIDERS.anthropic,
  MINIMAX: PROVIDERS.minimax,
};
