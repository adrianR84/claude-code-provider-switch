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

// Minimax configuration
const MINIMAX = {
  DEFAULT_HOST: "api.minimax.io",
  DEFAULT_PORT: 443,
  API_PATH: "/anthropic/v1/models",
  TIMEOUT: 10000,
  AUTH_HEADER: "Bearer",
};

// Cache configuration
const CACHE = {
  TTL: 5 * 60 * 1000, // 5 minutes in milliseconds
  MAX_SIZE: 50, // Maximum cache entries
  MAX_MEMORY: 10 * 1024 * 1024, // 10MB
  KEYS: {
    OLLAMA_MODELS: "ollama-models",
    OPENROUTER_MODELS: "openrouter-models",
    ANTHROPIC_MODELS: "anthropic-models",
    MINIMAX_MODELS: "minimax-models",
  },
};

// Environment variable names
const ENV_VARS = {
  OPENROUTER_AUTH_TOKEN: "OPENROUTER_AUTH_TOKEN",
  ANTHROPIC_API_KEY: "ANTHROPIC_API_KEY",
  OLLAMA_AUTH_TOKEN: "OLLAMA_AUTH_TOKEN",
  MINIMAX_AUTH_TOKEN: "MINIMAX_AUTH_TOKEN",
  OPENROUTER_MODEL: "OPENROUTER_MODEL",
  ANTHROPIC_MODEL: "ANTHROPIC_MODEL",
  OLLAMA_MODEL: "OLLAMA_MODEL",
  MINIMAX_MODEL: "MINIMAX_MODEL",
  DEFAULT_PROVIDER: "DEFAULT_PROVIDER",
  DEFAULT_MODEL: "DEFAULT_MODEL",
  CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: 1,
};

// Default models
const DEFAULT_MODELS = {
  OPENROUTER: "openrouter/free",
  ANTHROPIC: "claude-3-5-sonnet-latest",
  OLLAMA: "minimax-m2.5:cloud",
  MINIMAX: "minimax-m2.7",
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

module.exports = {
  OLLAMA,
  OPENROUTER,
  ANTHROPIC,
  MINIMAX,
  CACHE,
  ENV_VARS,
  DEFAULT_MODELS,
  HTTP_STATUS,
};
