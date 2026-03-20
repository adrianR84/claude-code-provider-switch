#!/usr/bin/env node

/**
 * Claude Code Provider Switcher - Main Entry Point
 * A modular CLI tool to switch between different AI providers for Claude Code
 */

const {
  showProviderMenu,
  showUsage,
  showDefaults,
  setupDefaults,
  showModelSelectionForProvider,
} = require("../lib/menu");
const { launchOpenRouter } = require("../lib/openrouter");
const { launchAnthropic } = require("../lib/anthropic");
const { launchOllama } = require("../lib/ollama");
const { launchDefault } = require("../lib/default");
const {
  getDefaultProvider,
  getDefaultModel,
  getProviderDefaultModel,
  log,
} = require("../lib/config");
const {
  PROVIDERS,
  COMMAND_TYPES,
  resolveProviderId,
  getAllProviderAliases,
} = require("../lib/constants");

// Global state to prevent infinite recursion and race conditions
let pendingRestartTimeout = null;
let recursionDepth = 0;
const MAX_RECURSION_DEPTH = 3;

// Provider launch mapping for DRY principle - built dynamically from constants
const PROVIDER_LAUNCHERS = {
  [PROVIDERS.OPENROUTER.id]: launchOpenRouter,
  [PROVIDERS.ANTHROPIC.id]: launchAnthropic,
  [PROVIDERS.OLLAMA.id]: launchOllama,
  [PROVIDERS.ORIGINAL.id]: launchDefault,
};

// Filter arguments to remove our own flags
function filterExtraArgs(args, excludeModel = true) {
  const exclusions = ["--version", "-v", "--help", "-h"];
  if (excludeModel) {
    exclusions.push("--model");
  }
  return args.filter((arg) => !exclusions.includes(arg));
}

// Filter arguments for provider commands
function filterProviderArgs(args, directModel = null) {
  // Get all provider aliases from constants
  const aliasMapping = getAllProviderAliases();
  const providerAliases = Object.keys(aliasMapping);

  const filtered = args.filter((arg) => !providerAliases.includes(arg));
  if (directModel) {
    return filtered.filter((arg) => arg !== directModel);
  }
  return filtered;
}

// Check if a default provider is set and valid
function hasValidDefaultProvider() {
  const defaultProvider = getDefaultProvider();
  return (
    defaultProvider && defaultProvider !== null && defaultProvider !== "default"
  );
}

// Launch provider with given parameters
async function launchProvider(
  providerId,
  showModelMenu = false,
  extraArgs = [],
  model = null,
) {
  // Resolve provider ID (handles both full names and aliases)
  const actualProvider = resolveProviderId(providerId);

  if (!actualProvider) {
    throw new Error(`Unknown provider: ${providerId}`);
  }

  const launcher = PROVIDER_LAUNCHERS[actualProvider];

  if (!launcher) {
    throw new Error(`No launcher found for provider: ${actualProvider}`);
  }

  if (actualProvider === PROVIDERS.ORIGINAL.id) {
    return await launcher(extraArgs);
  }

  const modelToUse = model || getProviderDefaultModel(actualProvider);
  return await launcher(showModelMenu, extraArgs, modelToUse);
}

// Launch default provider with given arguments
async function launchDefaultProvider(extraArgs = []) {
  const defaultProvider = getDefaultProvider();
  const defaultModel = getDefaultModel();

  log(
    `Using default: ${defaultProvider}${defaultModel ? ` (${defaultModel})` : ""}`,
    "green",
  );

  const modelToUse = defaultModel || getProviderDefaultModel(defaultProvider);
  await launchProvider(defaultProvider, false, extraArgs, modelToUse);
}

// Get command type
function getCommandType(command) {
  for (const [type, commands] of Object.entries(COMMAND_TYPES)) {
    if (commands.has(command)) {
      return type.toLowerCase();
    }
  }
  return "unknown";
}

// Show interactive menu loop
async function showInteractiveMenu() {
  const { showApiKeyMenu, saveConfigurationLocally } = require("../lib/config");

  while (true) {
    const selectedProvider = await showProviderMenu();

    switch (selectedProvider.id) {
      case "help":
        showUsage();
        return;
      case "set-default":
        await setupDefaults();
        handlePostConfiguration("restart", true);
        return;
      case "show-defaults":
        showDefaults();
        return;
      case "clear-defaults":
        const {
          setDefaultProvider,
          setDefaultModel,
          getDefaultProvider,
          getDefaultModel,
        } = require("../lib/config");

        setDefaultProvider("default");
        setDefaultModel("");

        log("Press Enter to continue...", "cyan");
        const clearRl = require("readline").createInterface({
          input: process.stdin,
          output: process.stdout,
        });
        await new Promise((resolve) => {
          clearRl.question("", () => {
            clearRl.close();
            resolve();
          });
        });
        continue;
      case "api-keys":
        await showApiKeyMenu();
        continue;
      case "save-local":
        await saveConfigurationLocally();
        log("Press Enter to continue...", "cyan");
        const saveRl = require("readline").createInterface({
          input: process.stdin,
          output: process.stdout,
        });
        await new Promise((resolve) => {
          saveRl.question("", () => {
            saveRl.close();
            resolve();
          });
        });
        continue;
    }

    // Handle provider selection
    let selectedModel = null;
    if (selectedProvider.id !== PROVIDERS.ORIGINAL.id) {
      selectedModel = await showModelSelectionForProvider(selectedProvider);
    }

    await launchProvider(selectedProvider.id, false, [], selectedModel);
    return;
  }
}

/**
 * Handle post-configuration actions with recursion protection and timeout management
 * @param {string} action - Action to perform ('restart' or 'menu')
 * @param {boolean} isInteractive - Whether this is from an interactive session
 */
function handlePostConfiguration(action = "restart", isInteractive = false) {
  // Validate parameters
  if (typeof action !== "string" || !["restart", "menu"].includes(action)) {
    throw new Error(`Invalid action: ${action}. Must be 'restart' or 'menu'`);
  }

  if (typeof isInteractive !== "boolean") {
    throw new Error(`Invalid isInteractive: ${isInteractive}. Must be boolean`);
  }

  if (action === "restart") {
    log("Configuration saved! Restarting application...", "green");
    log("", "reset");

    // Simulate restart by calling main() again to use defaults
    pendingRestartTimeout = setTimeout(() => {
      recursionDepth++;
      main(true)
        .catch((error) => {
          recursionDepth = 0;
          handleError(error, isInteractive);
        })
        .finally(() => {
          if (recursionDepth > 0) {
            recursionDepth--;
          }
        });
    }, 1000);
  } else if (action === "menu") {
    log("Defaults cleared! Returning to main menu...", "green");
    log("", "reset");

    // Return to main menu by forcing menu mode
    pendingRestartTimeout = setTimeout(() => {
      recursionDepth++;
      main(true)
        .catch((error) => {
          recursionDepth = 0;
          handleError(error, false);
        })
        .finally(() => {
          if (recursionDepth > 0) {
            recursionDepth--;
          }
        });
    }, 1000);
  }
}

/**
 * Standardized error handling
 * @param {Error} error - The error to handle
 * @param {boolean} isInteractive - Whether this is from an interactive session
 */
function handleError(error, isInteractive = false) {
  if (error instanceof Error) {
    log(`Error: ${error.message}`, "red");
  } else {
    log(`Error: ${String(error)}`, "red");
  }

  if (isInteractive) {
    log("Returning to menu...", "yellow");
    main(true).catch((recoveryError) => {
      log(`Recovery failed: ${recoveryError.message}`, "red");
      exitGracefully(1);
    });
  } else {
    exitGracefully(1);
  }
}

/**
 * Graceful process exit with cleanup
 * @param {number} code - Exit code
 */
function exitGracefully(code = 0) {
  // Cancel any pending timeout
  if (pendingRestartTimeout) {
    clearTimeout(pendingRestartTimeout);
    pendingRestartTimeout = null;
  }

  // Reset recursion depth
  recursionDepth = 0;

  process.exit(code);
}

/**
 * Main application logic
 * @param {boolean} forceMenu - Force menu mode by ignoring command-line arguments
 */
async function main(forceMenu = false) {
  // Validate forceMenu parameter
  if (typeof forceMenu !== "boolean") {
    throw new Error(`Invalid forceMenu: ${forceMenu}. Must be boolean`);
  }

  // Proper recursion depth management
  if (recursionDepth > 0) {
    // We're in a recursive call, this is expected
    // Don't modify recursionDepth here - it's managed by handlePostConfiguration
  } else {
    // First time starting, ensure recursion depth is 0
    recursionDepth = 0;
  }

  const args = forceMenu ? [] : process.argv.slice(2);

  // Handle UI argument first (before any other logic)
  if (args[0] === "ui") {
    await showInteractiveMenu();
    return;
  }

  // Handle management commands
  if (args[0] === "set-default") {
    await setupDefaults();
    handlePostConfiguration("restart", false);
    return;
  }

  if (args[0] === "show-defaults") {
    showDefaults();
    return;
  }

  if (args[0] === "clear-defaults") {
    const { setDefaultProvider, setDefaultModel } = require("../lib/config");
    setDefaultProvider("default");
    setDefaultModel("");
    log("Defaults cleared!", "green");
    handlePostConfiguration("menu", false);
    return;
  }

  if (args[0] === "save-local" || args[0] === "save-locally") {
    const { saveConfigurationLocally } = require("../lib/config");
    await saveConfigurationLocally();
    return;
  }

  if (args[0] === "api-keys") {
    const { showApiKeyMenu } = require("../lib/config");
    await showApiKeyMenu();
    return;
  }

  // Handle --version flag
  if (args[0] === "--version" || args[0] === "-v") {
    try {
      const packagePath = require.resolve("../package.json");
      const packageJson = require(packagePath);
      log(`claude-code-provider-switch v${packageJson.version}`, "green");
    } catch (error) {
      console.error("Error: Could not read version from package.json");
      process.exit(1);
    }
    return;
  }

  // Handle no arguments case
  if (args.length === 0) {
    if (hasValidDefaultProvider()) {
      await launchDefaultProvider([]);
    } else {
      showUsage();
    }
    return;
  }

  // Parse command and arguments
  const command = args[0].toLowerCase();
  const commandType = getCommandType(command);
  const showModelMenuParam = args.includes("--model");

  // Check for direct model specification after --model flag
  const modelIndex = args.indexOf("--model");
  let directModel = null;
  if (modelIndex !== -1 && args.length > modelIndex + 1) {
    directModel = args[modelIndex + 1];
  }

  // Handle default provider for non-provider commands
  if (
    commandType !== "provider" &&
    commandType !== "help" &&
    commandType !== "ui" &&
    hasValidDefaultProvider()
  ) {
    const extraArgs = filterExtraArgs(args);
    await launchDefaultProvider(extraArgs);
    return;
  }

  // Handle provider commands
  if (commandType === "provider") {
    const extraArgs = filterProviderArgs(args, directModel);
    await launchProvider(command, showModelMenuParam, extraArgs, directModel);
    return;
  }

  // Handle help commands
  if (commandType === "help") {
    showUsage();
    return;
  }

  // Handle unknown commands
  if (!hasValidDefaultProvider()) {
    log(`Unknown command '${command}'. Showing help...`, "yellow");
    log("", "reset");
    showUsage();
  } else {
    handleError(new Error(`Unknown command '${command}'`), false);
    showUsage();
  }
}

// Handle uncaught errors
process.on("uncaughtException", (error) => {
  handleError(error, false);
});

process.on("unhandledRejection", (reason, promise) => {
  handleError(new Error(`Unhandled rejection: ${reason}`), false);
});

// Run the application
main().catch((error) => {
  handleError(error, false);
});
