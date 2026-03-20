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

// Get user home directory for global configuration
const os = require("os");
const homeDir = os.homedir();
const claudeDir = path.join(homeDir, ".claude");
const globalEnvFile = path.join(claudeDir, ".claude-switch-env");

// Get script directory (use current working directory for global installs)
const scriptPath = process.cwd();
const localEnvFile = path.join(scriptPath, ".env");

// Use global env file by default, fallback to local
const envFile = globalEnvFile;

/**
 * Get configuration source (Local or Global)
 */
function getConfigurationSource() {
  if (fs.existsSync(localEnvFile)) {
    return "Local";
  }
  return "Global";
}

/**
 * Get configuration file path for display
 */
function getConfigurationPath() {
  if (fs.existsSync(localEnvFile)) {
    return localEnvFile;
  }
  return globalEnvFile;
}

/**
 * Check if global configuration exists and has meaningful content
 */
function hasGlobalConfiguration() {
  try {
    if (!fs.existsSync(globalEnvFile)) {
      return false;
    }

    const globalConfig = loadSingleEnvFile(globalEnvFile);

    // Check for at least one API key or default setting
    const hasApiKey =
      globalConfig.OPENROUTER_AUTH_TOKEN ||
      globalConfig.ANTHROPIC_API_KEY ||
      globalConfig.OLLAMA_AUTH_TOKEN;

    const hasDefaultSetting =
      globalConfig.DEFAULT_PROVIDER || globalConfig.DEFAULT_MODEL;

    return !!(hasApiKey || hasDefaultSetting);
  } catch (error) {
    return false;
  }
}

/**
 * Save configuration locally by copying global config to local .env
 */
async function saveConfigurationLocally() {
  // Ensure log is available in this context
  const localLog = log;

  try {
    // Check if global config exists
    if (!fs.existsSync(globalEnvFile)) {
      localLog("No global configuration found to copy.", "red");
      return false;
    }

    // Check if local file already exists
    if (fs.existsSync(localEnvFile)) {
      localLog("Local .env file already exists.", "yellow");
      localLog("This will overwrite your local configuration.", "yellow");

      // Ask for confirmation
      const readline = require("readline");
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const answer = await new Promise((resolve) => {
        rl.question("Do you want to continue? (y/N): ", resolve);
      });
      rl.close();

      if (answer.toLowerCase() !== "y" && answer.toLowerCase() !== "yes") {
        localLog("Operation cancelled.", "yellow");
        return false;
      }
    }

    // Copy global config to local
    const globalContent = fs.readFileSync(globalEnvFile, "utf8");
    fs.writeFileSync(localEnvFile, globalContent, "utf8");

    // Clear cache to reflect changes
    envCache = null;
    envCacheTime = null;

    localLog("Configuration saved locally!", "green");
    localLog(`Local file created: ${localEnvFile}`, "cyan");
    localLog("All future updates will use the local configuration.", "yellow");

    return true;
  } catch (error) {
    localLog(`Error saving configuration locally: ${error.message}`, "red");
    return false;
  }
}

/**
 * Load a single environment file without recursion
 */
function loadSingleEnvFile(filePath) {
  try {
    // Handle file existence race condition
    if (!fs.existsSync(filePath)) {
      if (filePath === globalEnvFile) {
        log("Global environment file not found. Creating one...", "yellow");
        createEnvFile(globalEnvFile);
      }
      // Return empty object for missing files (don't try to read)
      return {};
    }

    // Read file with error handling
    const envContent = fs.readFileSync(filePath, "utf8");
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
  } catch (error) {
    log(`Error loading environment file ${filePath}: ${error.message}`, "red");
    // Return empty object on error to prevent crashes
    return {};
  }
}

/**
 * Get configuration from both global and local files
 * Local settings override global settings
 */
function loadConfigFiles() {
  const globalConfig = loadSingleEnvFile(globalEnvFile);
  const localConfig = loadSingleEnvFile(localEnvFile);

  // Merge configs, local takes precedence
  return { ...globalConfig, ...localConfig };
}

/**
 * Update configuration with smart targeting (local if exists, global if not)
 */
function updateConfigFile(key, value, useGlobal = null) {
  // Smart targeting: if useGlobal is null, determine based on file existence
  let targetFile;
  if (useGlobal === null) {
    targetFile = fs.existsSync(localEnvFile) ? localEnvFile : globalEnvFile;
  } else {
    targetFile = useGlobal ? globalEnvFile : localEnvFile;
  }

  try {
    // Ensure the directory exists
    const targetDir = path.dirname(targetFile);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    let content = "";

    // Read existing file or create new one
    if (fs.existsSync(targetFile)) {
      content = fs.readFileSync(targetFile, "utf8");
    } else {
      createEnvFile(targetFile);
      content = fs.readFileSync(targetFile, "utf8");
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
    fs.writeFileSync(targetFile, updatedLines.join("\n"), "utf8");

    // Atomically invalidate cache
    envCache = null;
    envCacheTime = null;

    log(
      `Updated ${useGlobal ? "global" : "local"} configuration: ${key}`,
      "green",
    );
  } catch (error) {
    log(`Error updating configuration file: ${error.message}`, "red");
    throw error;
  }
}

/**
 * Create default .env file if it doesn't exist
 */
function createEnvFile(targetPath = globalEnvFile) {
  const defaultEnvContent = `# API Keys for different providers
OPENROUTER_AUTH_TOKEN=
ANTHROPIC_API_KEY=
OLLAMA_AUTH_TOKEN=

# Optional: Default models for each provider
OPENROUTER_MODEL=openrouter/free
ANTHROPIC_MODEL=claude-sonnet-4-6
OLLAMA_MODEL=minimax-m2.5:cloud

# Default provider and model settings
DEFAULT_PROVIDER=default
DEFAULT_MODEL=
`;

  try {
    // Ensure the directory exists
    const targetDir = path.dirname(targetPath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
      log(`Created directory: ${targetDir}`, "green");
    }

    fs.writeFileSync(targetPath, defaultEnvContent, "utf8");
    log(`Created environment file: ${targetPath}`, "green");
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
 * Uses merged configuration from global and local files
 */
function loadEnvFile() {
  const now = Date.now();

  // Return cached data if still valid
  if (envCache && envCacheTime && now - envCacheTime < CACHE_TTL) {
    return envCache;
  }

  try {
    // Load and merge global and local configurations
    const mergedConfig = loadConfigFiles();

    // Atomically update cache
    envCache = mergedConfig;
    envCacheTime = now;

    // Include envFile path in the returned object for debugging
    // Point envFile to the actual active configuration source
    mergedConfig.envFile = fs.existsSync(localEnvFile)
      ? localEnvFile
      : globalEnvFile;
    mergedConfig.localEnvFile = localEnvFile;

    return mergedConfig;
  } catch (error) {
    log(`Error loading environment files: ${error.message}`, "red");
    // Return empty object on error to prevent crashes
    return { envFile: globalEnvFile, localEnvFile };
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
  return vars.DEFAULT_PROVIDER || null;
}

/**
 * Get default model from environment
 */
function getDefaultModel(envVars = null) {
  const vars = envVars || loadEnvFile();
  return vars.DEFAULT_MODEL || "";
}

/**
 * Set default provider with smart targeting (local if exists, global if not)
 */
function setDefaultProvider(provider) {
  // Validate input
  if (typeof provider !== "string" || provider.trim() === "") {
    throw new Error("Provider must be a non-empty string");
  }

  updateConfigFile("DEFAULT_PROVIDER", provider.trim(), null);
  log(`Default provider set to: ${provider.trim()}`, "green");
}

/**
 * Set default model with smart targeting (local if exists, global if not)
 */
function setDefaultModel(model) {
  // Validate input (allow empty string for clearing)
  if (typeof model !== "string") {
    throw new Error("Model must be a string");
  }

  updateConfigFile("DEFAULT_MODEL", model.trim(), null);
  log(`Default model set to: ${model.trim()}`, "green");
}

/**
 * Get provider-specific default model
 */
function getProviderDefaultModel(provider, envVars = null) {
  const vars = envVars || loadEnvFile();
  const { DEFAULT_MODELS } = require("./constants");

  const modelMap = {
    openrouter: vars.OPENROUTER_MODEL || DEFAULT_MODELS.OPENROUTER,
    anthropic: vars.ANTHROPIC_MODEL || DEFAULT_MODELS.ANTHROPIC,
    ollama: vars.OLLAMA_MODEL || DEFAULT_MODELS.OLLAMA,
    original: "",
  };
  return modelMap[provider] || "";
}

/**
 * Show API key management menu
 */
async function showApiKeyMenu() {
  const readline = require("readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const providers = [
    { id: "openrouter", name: "OpenRouter", envVar: "OPENROUTER_AUTH_TOKEN" },
    { id: "anthropic", name: "Anthropic", envVar: "ANTHROPIC_API_KEY" },
    { id: "ollama", name: "Ollama", envVar: "OLLAMA_AUTH_TOKEN" },
  ];

  let selectedIndex = 0;

  function displayMenu() {
    console.clear();
    log("API Key Management", "cyan");
    log("", "reset");
    log("Select a provider to update its API key:", "yellow");
    log("", "reset");

    providers.forEach((provider, index) => {
      const marker = index === selectedIndex ? "❯" : " ";
      const envVars = loadEnvFile();
      const hasKey = envVars[provider.envVar] ? "✅" : "❌";
      log(
        `${marker} ${index + 1}) ${provider.name} - ${hasKey}`,
        index === selectedIndex ? "green" : "reset",
      );
    });

    log("", "reset");
    log("Controls:", "yellow");
    log("↑/↓ - Navigate", "reset");
    log("Enter - Update API key", "reset");
    log("1-3 - Quick select", "reset");
    log("ESC - Return to main menu", "reset");
    log("", "reset");
    log("💡 Tips:", "cyan");
    log("• ✅ = API key is set", "reset");
    log("• ❌ = API key is missing", "reset");
    log("• Press Enter to set or update the API key", "reset");
  }

  displayMenu();

  return new Promise((resolve) => {
    const handleKeyPress = (str, key) => {
      if (key.name === "up") {
        selectedIndex =
          (selectedIndex - 1 + providers.length) % providers.length;
        displayMenu();
      } else if (key.name === "down") {
        selectedIndex = (selectedIndex + 1) % providers.length;
        displayMenu();
      } else if (key.name === "escape") {
        process.stdin.removeAllListeners("keypress");
        rl.close();
        resolve();
      } else if (key.name === "return") {
        process.stdin.removeAllListeners("keypress");
        rl.close();
        updateApiKey(providers[selectedIndex]).then(resolve);
      } else if (str && /^[1-3]$/.test(str)) {
        const index = parseInt(str) - 1;
        if (index >= 0 && index < providers.length) {
          selectedIndex = index;
          process.stdin.removeAllListeners("keypress");
          rl.close();
          updateApiKey(providers[selectedIndex]).then(resolve);
        }
      }
    };

    // Set up raw mode for arrow key detection
    if (process.stdin.setRawMode) {
      process.stdin.setRawMode(true);
    }

    // Enable keypress events
    readline.emitKeypressEvents(process.stdin);

    process.stdin.on("keypress", handleKeyPress);
    rl.question("", () => {});
  });
}

/**
 * Update API key for a specific provider
 */
async function updateApiKey(provider) {
  const envVars = loadEnvFile();
  const currentKey = envVars[provider.envVar] || "";

  log(`\n=== ${provider.name} API Key Management ===`, "cyan");

  if (currentKey) {
    log(`Current API key: ${maskApiKey(currentKey)}`, "yellow");
    log("", "reset");

    const options = [
      { id: "update", name: "Update API key" },
      { id: "remove", name: "Remove API key" },
      { id: "cancel", name: "Cancel" },
    ];

    let selectedIndex = 0;

    function displayOptions() {
      log("Options:", "yellow");
      options.forEach((option, index) => {
        const marker = index === selectedIndex ? "❯" : " ";
        log(
          `${marker} ${option.name}`,
          index === selectedIndex ? "green" : "reset",
        );
      });
      log("", "reset");
      log("Controls:", "yellow");
      log("↑/↓ - Navigate", "reset");
      log("Enter - Select option", "reset");
      log("ESC - Cancel", "reset");
    }

    displayOptions();

    const readline = require("readline");
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const choice = await new Promise((resolve) => {
      const handleKeyPress = (str, key) => {
        if (key.name === "up") {
          selectedIndex = (selectedIndex - 1 + options.length) % options.length;
          // Clear and redraw
          console.clear();
          log(`=== ${provider.name} API Key Management ===`, "cyan");
          log(`Current API key: ${maskApiKey(currentKey)}`, "yellow");
          log("", "reset");
          displayOptions();
        } else if (key.name === "down") {
          selectedIndex = (selectedIndex + 1) % options.length;
          // Clear and redraw
          console.clear();
          log(`=== ${provider.name} API Key Management ===`, "cyan");
          log(`Current API key: ${maskApiKey(currentKey)}`, "yellow");
          log("", "reset");
          displayOptions();
        } else if (key.name === "escape") {
          process.stdin.removeAllListeners("keypress");
          rl.close();
          resolve("cancel");
        } else if (key.name === "return") {
          process.stdin.removeAllListeners("keypress");
          rl.close();
          resolve(options[selectedIndex].id);
        }
      };

      process.stdin.on("keypress", handleKeyPress);
      readline.emitKeypressEvents(process.stdin);
      if (process.stdin.setRawMode) {
        process.stdin.setRawMode(true);
      }
      rl.question("", () => {});
    });

    if (choice === "update") {
      const newKey = await promptForApiKey(provider.name, provider.envVar);
      if (newKey) {
        updateConfigFile(provider.envVar, newKey, null);
        log(`${provider.name} API key updated successfully!`, "green");
      }
    } else if (choice === "remove") {
      updateConfigFile(provider.envVar, "", null);
      log(`${provider.name} API key removed!`, "yellow");
    } else {
      log("Operation cancelled.", "yellow");
    }
  } else {
    log(`No ${provider.name} API key is currently set.`, "yellow");
    log("", "reset");
    const newKey = await promptForApiKey(provider.name, provider.envVar);
    if (newKey) {
      updateConfigFile(provider.envVar, newKey, null);
      log(`${provider.name} API key set successfully!`, "green");
    } else {
      log("Operation cancelled.", "yellow");
    }
  }

  log("", "reset");
  log("Press Enter to continue...", "cyan");

  const rl = require("readline").createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  await new Promise((resolve) => {
    rl.question("", () => {
      rl.close();
      resolve();
    });
  });
}

/**
 * Mask API key for display
 */
function maskApiKey(apiKey) {
  if (!apiKey) return "Not set";
  if (apiKey.length <= 8) return "*".repeat(apiKey.length);
  return (
    apiKey.substring(0, 4) +
    "*".repeat(apiKey.length - 8) +
    apiKey.substring(apiKey.length - 4)
  );
}

module.exports = {
  colors,
  log,
  envFile: globalEnvFile,
  localEnvFile,
  globalEnvFile,
  claudeDir,
  createEnvFile,
  promptForApiKey,
  updateEnvFile,
  updateConfigFile,
  loadEnvFile,
  loadSingleEnvFile,
  loadConfigFiles,
  findBestMatchingModel,
  getDefaultProvider,
  getDefaultModel,
  setDefaultProvider,
  setDefaultModel,
  getProviderDefaultModel,
  showApiKeyMenu,
  updateApiKey,
  maskApiKey,
  getConfigurationSource,
  getConfigurationPath,
  hasGlobalConfiguration,
  saveConfigurationLocally,
};
