/**
 * Application constants
 */


// ================================
// PROVIDER DEFINITIONS
// ================================

const PROVIDERS = {
  OPENROUTER: {
    id: "openrouter",
    name: "OpenRouter",
    aliases: ["openrouter", "or", "open"],
  },
  OLLAMA: {
    id: "ollama",
    name: "Ollama",
    aliases: ["ollama", "oll"],
  },
  ANTHROPIC: {
    id: "anthropic",
    name: "Anthropic",
    aliases: ["anthropic", "ant"],
  },
  ORIGINAL: {
    id: "original",
    name: "Original Claude Code",
    aliases: ["original", "orig", "def", "d"],
  },
};


// ================================
// PROVIDER CONFIGURATIONS
// ================================

const PROVIDER_CONFIG = {
  OPENROUTER: {
    DEFAULT_HOST: "openrouter.ai",
    DEFAULT_PORT: 443,
    API_PATH: "/api/v1/models",
    TIMEOUT: 10000,
    AUTH_HEADER: "Bearer",
  },
  ANTHROPIC: {
    DEFAULT_HOST: "api.anthropic.com",
    DEFAULT_PORT: 443,
    API_PATH: "/v1/models",
    TIMEOUT: 10000,
    AUTH_HEADER: "X-Api-Key",
  },
  OLLAMA: {
    DEFAULT_HOST: "localhost",
    DEFAULT_PORT: 11434,
    API_PATH: "/api/tags",
    TIMEOUT: 5000,
    AUTH_HEADER: "Bearer",
  },
};

// Extract individual provider configs for backward compatibility
const { OPENROUTER, ANTHROPIC, OLLAMA } = PROVIDER_CONFIG;

// ================================
// CACHE CONFIGURATION
// ================================

const CACHE = {
  TTL: 5 * 60 * 1000, // 5 minutes in milliseconds
  KEYS: {
    OLLAMA_MODELS: "ollama-models",
    OPENROUTER_MODELS: "openrouter-models",
    ANTHROPIC_MODELS: "anthropic-models",
  },
};

// ================================
// ENVIRONMENT VARIABLES
// ================================

const ENV_VARS = {
  // API Keys
  OPENROUTER_AUTH_TOKEN: "OPENROUTER_AUTH_TOKEN",
  ANTHROPIC_API_KEY: "ANTHROPIC_API_KEY",
  OLLAMA_AUTH_TOKEN: "OLLAMA_AUTH_TOKEN",

  // Default Models
  OPENROUTER_MODEL: "OPENROUTER_MODEL",
  ANTHROPIC_MODEL: "ANTHROPIC_MODEL",
  OLLAMA_MODEL: "OLLAMA_MODEL",

  // Global Defaults
  DEFAULT_PROVIDER: "DEFAULT_PROVIDER",
  DEFAULT_MODEL: "DEFAULT_MODEL",
};

// ================================
// DEFAULT MODELS
// ================================

const DEFAULT_MODELS = {
  OPENROUTER: "openrouter/free",
  ANTHROPIC: "claude-3-5-sonnet-latest",
  OLLAMA: "minimax-m2.5:cloud",
  ORIGINAL: "original",
};

// ================================
// HTTP STATUS CODES
// ================================

const HTTP_STATUS = {
  OK: 200,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  SERVER_ERROR: 500,
};


// ================================
// COMMAND TYPES
// ================================

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

// ================================
// HELPER FUNCTIONS
// ================================

/**
 * Get all provider aliases as a mapping object
 * @returns {Object} Mapping of alias -> providerId
 */
function getAllProviderAliases() {
  const aliases = {};
  Object.values(PROVIDERS).forEach((provider) => {
    provider.aliases.forEach((alias) => {
      aliases[alias] = provider.id;
    });
  });
  return aliases;
}

/**
 * Get provider configuration by ID
 * @param {string} providerId - Provider ID
 * @returns {Object|null} Provider configuration
 */
function getProviderById(providerId) {
  return Object.values(PROVIDERS).find(
    (provider) => provider.id === providerId,
  );
}

/**
 * Get provider by alias
 * @param {string} alias - Provider alias
 * @returns {Object|null} Provider object
 */
function getProviderByAlias(alias) {
  return Object.values(PROVIDERS).find((provider) =>
    provider.aliases.includes(alias),
  );
}

/**
 * Resolve provider ID from input (ID or alias)
 * @param {string} input - Provider ID or alias
 * @returns {string|null} Resolved provider ID
 */
function resolveProviderId(input) {
  // First check if it's a direct provider ID
  const provider = getProviderById(input);
  if (provider) return provider.id;

  // Then check if it's an alias
  const aliasProvider = getProviderByAlias(input);
  if (aliasProvider) return aliasProvider.id;

  return null; // Not found
}

/**
 * Build provider URL
 * @param {string} providerId - Provider ID
 * @param {string} protocol - Protocol (default: "https")
 * @returns {string|null} Provider URL
 */
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

/**
 * Get configuration for provider
 * @param {string} providerId - Provider ID
 * @returns {Object|null} Provider configuration
 */
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

// ================================
// MODULE EXPORTS
// ================================

module.exports = {
  // Provider configurations
  OLLAMA,
  OPENROUTER,
  ANTHROPIC,

  // System configurations
  CACHE,
  ENV_VARS,
  DEFAULT_MODELS,
  HTTP_STATUS,

  // Provider definitions
  PROVIDERS,
  COMMAND_TYPES,

  // Helper functions
  getAllProviderAliases,
  resolveProviderId,
  buildProviderUrl,
  getConfigForProvider,
};
