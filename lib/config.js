/**
 * Configuration and utilities for Claude Code Provider Switcher
 */

const fs = require("fs");
const path = require("path");

// Colors for output
const colors = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  orange: "\x1b[38;5;208m", // Orange color (256-color mode)
  reset: "\x1b[0m",
};

// Logging utility
function log(message, color = "reset") {
  const colorCode = colors[color] || colors.reset;
  console.log(`${colorCode}${message}${colors.reset}`);
}

// Get script directory (use current working directory for global installs)
const scriptPath = process.cwd();
const envFile = path.join(scriptPath, ".env");

/**
 * Create default .env file if it doesn't exist
 */
function createEnvFile() {
  const defaultEnvContent = `# API Keys for different providers
OPENROUTER_AUTH_TOKEN=
ANTHROPIC_API_KEY=
OLLAMA_AUTH_TOKEN=

# Optional: Default models for each provider
OPENROUTER_MODEL=openrouter/free
ANTHROPIC_MODEL=claude-3-5-sonnet-latest
OLLAMA_MODEL=minimax-m2.5:cloud

# Default provider and model settings
DEFAULT_PROVIDER=original
DEFAULT_MODEL=
`;

  try {
    fs.writeFileSync(envFile, defaultEnvContent, "utf8");
    log(`Created environment file: ${envFile}`, "green");
    log("Please add your API keys to .env file", "yellow");
    return true;
  } catch (error) {
    log(`Error creating .env file: ${error.message}`, "red");
    return false;
  }
}

/**
 * Prompt user for API key input
 */
function promptForApiKey(providerName, envVarName) {
  const readline = require("readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`Enter ${providerName} API key (${envVarName}): `, (apiKey) => {
      rl.close();
      resolve(apiKey.trim());
    });
  });
}

/**
 * Update environment variable in .env file
 */
function updateEnvFile(key, value) {
  try {
    let content = "";

    // Read existing file or create new one
    if (fs.existsSync(envFile)) {
      content = fs.readFileSync(envFile, "utf8");
    } else {
      createEnvFile();
      content = fs.readFileSync(envFile, "utf8");
    }

    const lines = content.split("\n");
    let keyFound = false;

    // Update or add the key
    const updatedLines = lines.map((line) => {
      if (line.startsWith(`${key}=`)) {
        keyFound = true;
        return `${key}=${value}`;
      }
      return line;
    });

    if (!keyFound) {
      updatedLines.push(`${key}=${value}`);
    }

    // Write back to file
    fs.writeFileSync(envFile, updatedLines.join("\n"), "utf8");

    // Atomically invalidate cache
    envCache = null;
    envCacheTime = null;
  } catch (error) {
    log(`Error updating .env file: ${error.message}`, "red");
    throw error; // Re-throw to allow caller to handle
  }
}

/**
 * Environment variable cache
 */
let envCache = null;
let envCacheTime = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

/**
 * Load environment variables from .env file with caching
 */
function loadEnvFile() {
  const now = Date.now();

  // Return cached data if still valid
  if (envCache && envCacheTime && now - envCacheTime < CACHE_TTL) {
    return envCache;
  }

  try {
    // Handle file existence race condition
    if (!fs.existsSync(envFile)) {
      log("Environment file not found. Creating one...", "yellow");
      createEnvFile();
    }

    // Read file with error handling
    const envContent = fs.readFileSync(envFile, "utf8");
    const envVars = {};

    envContent.split("\n").forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const [key, ...valueParts] = trimmed.split("=");
        if (key && valueParts.length > 0) {
          envVars[key.trim()] = valueParts.join("=").trim();
        }
      }
    });

    // Atomically update cache
    envCache = envVars;
    envCacheTime = now;

    // Include envFile path in the returned object for debugging
    envVars.envFile = envFile;

    return envVars;
  } catch (error) {
    log(`Error loading environment file: ${error.message}`, "red");
    // Return empty object on error to prevent crashes
    return { envFile };
  }
}

/**
 * Find best matching model from available models
 */
function findBestMatchingModel(searchTerm, models) {
  const searchLower = searchTerm.toLowerCase();

  // Exact match first
  const exactMatch = models.find((model) => {
    const modelName = model.id || model.name || "";
    return modelName.toLowerCase() === searchLower;
  });
  if (exactMatch) return exactMatch.id || exactMatch.name;

  // Partial match (contains)
  const partialMatches = models.filter((model) => {
    const modelName = model.id || model.name || "";
    return modelName.toLowerCase().includes(searchLower);
  });

  if (partialMatches.length === 0) return null;
  if (partialMatches.length === 1)
    return partialMatches[0].id || partialMatches[0].name;

  // Multiple matches - return the shortest/most specific one
  return (
    partialMatches.reduce((best, current) => {
      const bestLength = (best.id || best.name || "").length;
      const currentLength = (current.id || current.name || "").length;
      return currentLength < bestLength ? current : best;
    }).id || partialMatches[0].name
  );
}

/**
 * Get default provider from environment
 */
function getDefaultProvider(envVars = null) {
  const vars = envVars || loadEnvFile();
  return vars.DEFAULT_PROVIDER || "original";
}

/**
 * Get default model from environment
 */
function getDefaultModel(envVars = null) {
  const vars = envVars || loadEnvFile();
  return vars.DEFAULT_MODEL || "";
}

/**
 * Set default provider in .env file
 */
function setDefaultProvider(provider) {
  // Validate input
  if (typeof provider !== "string" || provider.trim() === "") {
    throw new Error("Provider must be a non-empty string");
  }

  updateEnvFile("DEFAULT_PROVIDER", provider.trim());
  log(`Default provider set to: ${provider.trim()}`, "green");
}

/**
 * Set default model in .env file
 */
function setDefaultModel(model) {
  // Validate input (allow empty string for clearing)
  if (typeof model !== "string") {
    throw new Error("Model must be a string");
  }

  updateEnvFile("DEFAULT_MODEL", model.trim());
  log(`Default model set to: ${model.trim()}`, "green");
}

/**
 * Get provider-specific default model
 */
function getProviderDefaultModel(provider, envVars = null) {
  const vars = envVars || loadEnvFile();
  const modelMap = {
    openrouter: vars.OPENROUTER_MODEL || "openrouter/free",
    anthropic: vars.ANTHROPIC_MODEL || "claude-3-5-sonnet-latest",
    ollama: vars.OLLAMA_MODEL || "minimax-m2.5:cloud",
    original: "",
  };
  return modelMap[provider] || "";
}

module.exports = {
  colors,
  log,
  envFile,
  createEnvFile,
  promptForApiKey,
  updateEnvFile,
  loadEnvFile,
  findBestMatchingModel,
  getDefaultProvider,
  getDefaultModel,
  setDefaultProvider,
  setDefaultModel,
  getProviderDefaultModel,
};
