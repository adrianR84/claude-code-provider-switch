/**
 * Application constants
 */

// Ollama configuration
const OLLAMA = {
  DEFAULT_HOST: "localhost",
  DEFAULT_PORT: 11434,
  API_PATH: "/api/tags",
  TIMEOUT: 5000,
  AUTH_HEADER: "Bearer",
};

// OpenRouter configuration
const OPENROUTER = {
  DEFAULT_HOST: "openrouter.ai",
  DEFAULT_PORT: 443,
  API_PATH: "/api/v1/models",
  TIMEOUT: 10000,
  AUTH_HEADER: "Bearer",
};

// Anthropic configuration
const ANTHROPIC = {
  DEFAULT_HOST: "api.anthropic.com",
  DEFAULT_PORT: 443,
  API_PATH: "/v1/models",
  TIMEOUT: 10000,
  AUTH_HEADER: "X-Api-Key",
};

// Cache configuration
const CACHE = {
  TTL: 5 * 60 * 1000, // 5 minutes in milliseconds
  KEYS: {
    OLLAMA_MODELS: "ollama-models",
    OPENROUTER_MODELS: "openrouter-models",
    ANTHROPIC_MODELS: "anthropic-models",
  },
};

// Environment variable names
const ENV_VARS = {
  OPENROUTER_AUTH_TOKEN: "OPENROUTER_AUTH_TOKEN",
  ANTHROPIC_API_KEY: "ANTHROPIC_API_KEY",
  OLLAMA_AUTH_TOKEN: "OLLAMA_AUTH_TOKEN",
  OPENROUTER_MODEL: "OPENROUTER_MODEL",
  ANTHROPIC_MODEL: "ANTHROPIC_MODEL",
  OLLAMA_MODEL: "OLLAMA_MODEL",
  DEFAULT_PROVIDER: "DEFAULT_PROVIDER",
  DEFAULT_MODEL: "DEFAULT_MODEL",
};

// Default models
const DEFAULT_MODELS = {
  OPENROUTER: "openrouter/free",
  ANTHROPIC: "claude-3-5-sonnet-latest",
  OLLAMA: "minimax-m2.5:cloud",
  ORIGINAL: "original",
};

// HTTP status codes
const HTTP_STATUS = {
  OK: 200,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  SERVER_ERROR: 500,
};

// Provider configuration and aliases
const PROVIDERS = {
  OPENROUTER: {
    id: "openrouter",
    name: "OpenRouter",
    aliases: ["openrouter", "or", "open"],
  },
  ANTHROPIC: {
    id: "anthropic",
    name: "Anthropic",
    aliases: ["anthropic", "ant"],
  },
  OLLAMA: {
    id: "ollama",
    name: "Ollama",
    aliases: ["ollama", "oll"],
  },
  ORIGINAL: {
    id: "original",
    name: "Original Claude Code",
    aliases: ["original", "orig", "def", "d"],
  },
};

// Command type constants for better maintainability
const COMMAND_TYPES = {
  PROVIDER: new Set([
    "openrouter",
    "or",
    "open",
    "anthropic",
    "ant",
    "ollama",
    "oll",
    "original",
    "orig",
    "def",
    "d",
  ]),
  HELP: new Set(["help", "--help", "-h"]),
  UI: new Set(["ui"]),
};

// Helper functions for provider operations
function getAllProviderAliases() {
  const aliases = {};
  Object.values(PROVIDERS).forEach((provider) => {
    provider.aliases.forEach((alias) => {
      aliases[alias] = provider.id;
    });
  });
  return aliases;
}

function getProviderById(providerId) {
  return Object.values(PROVIDERS).find(
    (provider) => provider.id === providerId,
  );
}

function getProviderByAlias(alias) {
  return Object.values(PROVIDERS).find((provider) =>
    provider.aliases.includes(alias),
  );
}

function resolveProviderId(input) {
  // First check if it's a direct provider ID
  const provider = getProviderById(input);
  if (provider) return provider.id;

  // Then check if it's an alias
  const aliasProvider = getProviderByAlias(input);
  if (aliasProvider) return aliasProvider.id;

  return null; // Not found
}

function buildProviderUrl(providerId, protocol = "https") {
  const provider = getProviderById(providerId);
  if (!provider) return null;

  const config = getConfigForProvider(providerId);
  if (!config) return null;

  const port =
    (config.DEFAULT_PORT === 443 && protocol === "https") ||
    (config.DEFAULT_PORT === 80 && protocol === "http")
      ? ""
      : `:${config.DEFAULT_PORT}`;

  return `${protocol}://${config.DEFAULT_HOST}${port}${config.API_PATH}`;
}

function getConfigForProvider(providerId) {
  switch (providerId) {
    case "openrouter":
      return OPENROUTER;
    case "anthropic":
      return ANTHROPIC;
    case "ollama":
      return OLLAMA;
    default:
      return null;
  }
}

module.exports = {
  OLLAMA,
  OPENROUTER,
  ANTHROPIC,
  CACHE,
  ENV_VARS,
  DEFAULT_MODELS,
  HTTP_STATUS,
  PROVIDERS,
  COMMAND_TYPES,
  getAllProviderAliases,
  resolveProviderId,
  buildProviderUrl,
  getConfigForProvider,
};
