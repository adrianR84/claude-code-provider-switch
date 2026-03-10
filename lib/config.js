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
  reset: "\x1b[0m",
};

// Get script directory (use current working directory when loaded from main script)
const scriptDir = process.cwd();
const envFile = path.join(scriptDir, ".env");

/**
 * Logging utility
 */
function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

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
 * Update specific variable in .env file
 */
function updateEnvFile(envVarName, value) {
  try {
    const envContent = fs.readFileSync(envFile, "utf8");
    const lines = envContent.split("\n");
    let updated = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith(`${envVarName}=`)) {
        lines[i] = `${envVarName}=${value}`;
        updated = true;
        break;
      }
    }

    if (updated) {
      fs.writeFileSync(envFile, lines.join("\n"), "utf8");
      log(`Updated ${envVarName} in .env file`, "green");
    }
  } catch (error) {
    log(`Error updating .env file: ${error.message}`, "red");
  }
}

/**
 * Load environment variables from .env file
 */
function loadEnvFile() {
  if (!fs.existsSync(envFile)) {
    log("Environment file not found. Creating one...", "yellow");
    createEnvFile();
  }

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

  return envVars;
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

module.exports = {
  colors,
  log,
  envFile,
  createEnvFile,
  promptForApiKey,
  updateEnvFile,
  loadEnvFile,
  findBestMatchingModel,
};
