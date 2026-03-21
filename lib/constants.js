/**
 * Application constants - Organized by category
 */

// ==================== PROVIDER CONFIGURATIONS ====================

// Ollama provider configuration
const OLLAMA = {
  // Connection settings
  DEFAULT_HOST: "localhost",
  DEFAULT_PORT: 11434,
  API_PATH: "/api/tags",
  TIMEOUT: 5000,
  AUTH_HEADER: "Bearer",

  // Environment variable mappings
  ENV_VARS: {
    AUTH_TOKEN: "OLLAMA_AUTH_TOKEN",
    MODEL: "OLLAMA_MODEL",
  },

  // Default settings
  DEFAULT_MODEL: "minimax-m2.5:cloud",
};

// OpenRouter provider configuration
const OPENROUTER = {
  // Connection settings
  DEFAULT_HOST: "openrouter.ai",
  DEFAULT_PORT: 443,
  API_PATH: "/api/v1/models",
  TIMEOUT: 10000,
  AUTH_HEADER: "Bearer",

  // Environment variable mappings
  ENV_VARS: {
    AUTH_TOKEN: "OPENROUTER_AUTH_TOKEN",
    MODEL: "OPENROUTER_MODEL",
  },

  // Default settings
  DEFAULT_MODEL: "openrouter/free",
};

// Anthropic provider configuration
const ANTHROPIC = {
  // Connection settings
  DEFAULT_HOST: "api.anthropic.com",
  DEFAULT_PORT: 443,
  API_PATH: "/v1/models",
  TIMEOUT: 10000,
  AUTH_HEADER: "X-Api-Key",

  // Environment variable mappings
  ENV_VARS: {
    AUTH_TOKEN: "ANTHROPIC_API_KEY",
    MODEL: "ANTHROPIC_MODEL",
  },

  // Default settings
  DEFAULT_MODEL: "claude-3-5-sonnet-latest",
};

// Minimax provider configuration
const MINIMAX = {
  // Connection settings
  DEFAULT_HOST: "api.minimax.io",
  DEFAULT_PORT: 443,
  API_PATH: "/anthropic/v1/models",
  TIMEOUT: 10000,
  AUTH_HEADER: "Bearer",

  // Environment variable mappings
  ENV_VARS: {
    AUTH_TOKEN: "MINIMAX_AUTH_TOKEN",
    MODEL: "MINIMAX_MODEL",
  },

  // Default settings
  DEFAULT_MODEL: "minimax-m2.7",
};

// ==================== CACHE CONFIGURATION ====================

const CACHE = {
  // Cache settings
  TTL: 5 * 60 * 1000, // 5 minutes in milliseconds
  MAX_SIZE: 50, // Maximum cache entries
  MAX_MEMORY: 10 * 1024 * 1024, // 10MB

  // Cache keys for different providers
  KEYS: {
    OLLAMA_MODELS: "ollama-models",
    OPENROUTER_MODELS: "openrouter-models",
    ANTHROPIC_MODELS: "anthropic-models",
    MINIMAX_MODELS: "minimax-models",
  },
};

// ==================== ENVIRONMENT VARIABLES ====================

// Centralized environment variable names
const ENV_VARS = {
  // Provider authentication tokens
  OPENROUTER_AUTH_TOKEN: "OPENROUTER_AUTH_TOKEN",
  ANTHROPIC_API_KEY: "ANTHROPIC_API_KEY",
  OLLAMA_AUTH_TOKEN: "OLLAMA_AUTH_TOKEN",
  MINIMAX_AUTH_TOKEN: "MINIMAX_AUTH_TOKEN",

  // Provider-specific model settings
  OPENROUTER_MODEL: "OPENROUTER_MODEL",
  ANTHROPIC_MODEL: "ANTHROPIC_MODEL",
  OLLAMA_MODEL: "OLLAMA_MODEL",
  MINIMAX_MODEL: "MINIMAX_MODEL",

  // Default configuration settings
  DEFAULT_PROVIDER: "DEFAULT_PROVIDER",
  DEFAULT_MODEL: "DEFAULT_MODEL",

  // Application settings
  CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC:
    "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC",
};

// ==================== DEFAULT MODELS ====================

const DEFAULT_MODELS = {
  OPENROUTER: OPENROUTER.DEFAULT_MODEL,
  ANTHROPIC: ANTHROPIC.DEFAULT_MODEL,
  OLLAMA: OLLAMA.DEFAULT_MODEL,
  MINIMAX: MINIMAX.DEFAULT_MODEL,
  ORIGINAL: "original",
};

// ==================== HTTP STATUS CODES ====================

const HTTP_STATUS = {
  OK: 200,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  SERVER_ERROR: 500,
};

// ==================== DEFAULT VALUES ====================

const DEFAULT_VALUES = {
  CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1",
};

// ==================== PROVIDER ALIASES ====================

const PROVIDER_ALIASES = {
  // OpenRouter aliases
  openrouter: ["openrouter", "or", "open"],

  // Anthropic aliases
  anthropic: ["anthropic", "ant"],

  // Minimax aliases
  minimax: ["minimax", "min", "mm"],

  // Ollama aliases
  ollama: ["ollama", "oll"],

  // Original/default aliases
  original: ["original", "orig", "def", "d"],
};

// ==================== PROVIDER MAPPINGS ====================

// Helper function to get provider configuration by name
function getProviderConfig(providerName) {
  const providers = {
    ollama: OLLAMA,
    openrouter: OPENROUTER,
    anthropic: ANTHROPIC,
    minimax: MINIMAX,
  };
  return providers[providerName];
}

// Helper function to get environment variable name for provider
function getProviderEnvVar(providerName, varType) {
  const config = getProviderConfig(providerName);
  if (!config || !config.ENV_VARS || !config.ENV_VARS[varType]) {
    return null;
  }
  return config.ENV_VARS[varType];
}

// Helper function to get all provider aliases flattened
function getAllProviderAliases() {
  const allAliases = [];
  Object.values(PROVIDER_ALIASES).forEach((aliases) => {
    allAliases.push(...aliases);
  });
  return allAliases;
}

// Helper function to find provider ID from command/alias
function getProviderIdFromCommand(command) {
  for (const [providerId, aliases] of Object.entries(PROVIDER_ALIASES)) {
    if (aliases.includes(command.toLowerCase())) {
      return providerId;
    }
  }
  return null; // Not found
}

// ==================== EXPORTS ====================

module.exports = {
  // Provider configurations
  OLLAMA,
  OPENROUTER,
  ANTHROPIC,
  MINIMAX,

  // System configurations
  CACHE,
  ENV_VARS,
  DEFAULT_MODELS,
  HTTP_STATUS,
  DEFAULT_VALUES,
  PROVIDER_ALIASES,

  // Helper functions
  getProviderConfig,
  getProviderEnvVar,
  getAllProviderAliases,
  getProviderIdFromCommand,
};
