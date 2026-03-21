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
const { launchMinimax } = require("../lib/minimax");
const { launchDefault } = require("../lib/default");
const {
  getDefaultProvider,
  getDefaultModel,
  getProviderDefaultModel,
} = require("../lib/config");
const {
  ENV_VARS,
  getAllProviderAliases,
  getProviderIdFromCommand,
} = require("../lib/constants");

// Global state to prevent infinite recursion and race conditions
let pendingRestartTimeout = null;
let recursionDepth = 0;
const MAX_RECURSION_DEPTH = 3;

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

  const { log } = require("../lib/config");

  // Prevent infinite recursion
  if (recursionDepth >= MAX_RECURSION_DEPTH) {
    log(
      "Maximum configuration changes reached. Please restart manually.",
      "red",
    );
    exitGracefully(1);
    return;
  }

  // Cancel any pending timeout to prevent race conditions
  if (pendingRestartTimeout) {
    clearTimeout(pendingRestartTimeout);
    pendingRestartTimeout = null;
  }

  if (action === "restart") {
    log("Configuration saved! Restarting application...", "green");
    log("", "reset");

    // Simulate restart by calling main() with no arguments to use defaults in CLI mode
    pendingRestartTimeout = setTimeout(() => {
      recursionDepth++;
      main(true, true) // Force menu mode to clear args, but mark as restart for CLI mode
        .catch((error) => {
          recursionDepth = 0; // Reset on error
          handleError(error, isInteractive);
        })
        .finally(() => {
          // Decrement recursion depth after completion
          if (recursionDepth > 0) {
            recursionDepth--;
          }
        });
    }, 1000); // Short delay for user to see message
  } else if (action === "menu") {
    log("Defaults cleared! Returning to main menu...", "green");
    log("", "reset");

    // Return to main menu by forcing UI mode
    pendingRestartTimeout = setTimeout(() => {
      recursionDepth++;
      main(true, false) // Force menu mode and mark as not restart (show UI)
        .catch((error) => {
          recursionDepth = 0; // Reset on error
          handleError(error, false); // Menu mode always exits on error
        })
        .finally(() => {
          // Decrement recursion depth after completion
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
  const { log } = require("../lib/config");

  if (error instanceof Error) {
    log(`Error: ${error.message}`, "red");
  } else {
    log(`Error: ${String(error)}`, "red");
  }

  if (isInteractive) {
    log("Returning to menu...", "yellow");
    // Don't increment recursion depth for error recovery
    main(true, false).catch((recoveryError) => {
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
 * Show interactive menu (UI mode)
 */
async function showInteractiveMenu() {
  // Import config functions once at the top
  const {
    setDefaultProvider,
    setDefaultModel,
    log,
    showApiKeyMenu,
    saveConfigurationLocally,
  } = require("../lib/config");

  // Show interactive menu loop
  mainLoop: while (true) {
    const selectedProvider = await showProviderMenu();

    // Handle special menu options
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
        setDefaultProvider("default");
        setDefaultModel("");
        log("Defaults cleared!", "green");
        handlePostConfiguration("menu", true);
        return;
      case "api-keys":
        await showApiKeyMenu();
        // Continue the loop to show menu again
        continue mainLoop;
      case "save-local":
        await saveConfigurationLocally();
        // Show menu again after saving locally
        log("Press Enter to continue...", "cyan");
        const continueRl = require("readline").createInterface({
          input: process.stdin,
          output: process.stdout,
        });
        await new Promise((resolve) => {
          continueRl.question("", () => {
            continueRl.close();
            resolve();
          });
        });
        // Continue the loop to show menu again
        continue mainLoop;
    }

    // For provider selection, show model selection
    let selectedModel = null;
    if (selectedProvider.id !== "original") {
      selectedModel = await showModelSelectionForProvider(selectedProvider);
    }

    // Launch the selected provider with the selected model
    switch (selectedProvider.id) {
      case "openrouter":
        await launchOpenRouter(false, [], selectedModel);
        break;
      case "anthropic":
        await launchAnthropic(false, [], selectedModel);
        break;
      case "minimax":
        await launchMinimax(false, [], selectedModel);
        break;
      case "ollama":
        await launchOllama(false, [], selectedModel);
        break;
      case "original":
        await launchDefault([]);
        break;
    }
    return;
  }
}

/**
 * Handle CLI mode - use defaults or show help
 */
async function handleCliMode(args) {
  const defaultProvider = getDefaultProvider();
  const defaultModel = getDefaultModel();

  if (
    defaultProvider &&
    defaultProvider !== null &&
    defaultProvider !== "default"
  ) {
    const { log } = require("../lib/config");
    log(
      `Using default: ${defaultProvider}${defaultModel ? ` (${defaultModel})` : ""}`,
      "green",
    );

    // Launch default provider with default model and extra args
    const modelToUse = defaultModel || getProviderDefaultModel(defaultProvider);

    switch (defaultProvider) {
      case "openrouter":
        await launchOpenRouter(false, args, modelToUse);
        break;
      case "anthropic":
        await launchAnthropic(false, args, modelToUse);
        break;
      case "minimax":
        await launchMinimax(false, args, modelToUse);
        break;
      case "ollama":
        await launchOllama(false, args, modelToUse);
        break;
      case "original":
        await launchDefault(args);
        break;
    }
  } else {
    // No defaults set, show usage help
    showUsage();
  }
}

/**
 * Main application logic
 * @param {boolean} forceMenu - Force menu mode by ignoring command-line arguments
 * @param {boolean} isRestart - True if this is a restart call (should use CLI mode)
 */
async function main(forceMenu = false, isRestart = false) {
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

  // Handle UI mode - show interactive menu (only if not a restart)
  if (args[0] === "ui" || (forceMenu && !isRestart)) {
    await showInteractiveMenu();
    return;
  }

  // Handle special commands first
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
    const { log } = require("../lib/config");
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
      const { log } = require("../lib/config");
      log(`claude-code-provider-switch v${packageJson.version}`, "green");
    } catch (error) {
      console.error("Error: Could not read version from package.json");
      process.exit(1);
    }
    return;
  }

  // Handle help commands before checking defaults
  if (args[0] === "help" || args[0] === "-h" || args[0] === "--help") {
    showUsage();
    return;
  }

  // Check for default provider first (but only for non-provider commands)
  const defaultProvider = getDefaultProvider();
  const defaultModel = getDefaultModel();
  const allProviderAliases = getAllProviderAliases();
  const isProviderCommand = allProviderAliases.includes(args[0]?.toLowerCase());

  if (
    !isProviderCommand &&
    defaultProvider &&
    defaultProvider !== null &&
    defaultProvider !== "default"
  ) {
    const { log } = require("../lib/config");
    log(
      `Using default: ${defaultProvider}${defaultModel ? ` (${defaultModel})` : ""}`,
      "green",
    );

    // Extract extra args (filter out our own flags)
    const extraArgs = args.filter(
      (arg) =>
        arg !== "--version" &&
        arg !== "-v" &&
        arg !== "--help" &&
        arg !== "-h" &&
        arg !== "--model",
    );

    // Launch default provider with default model and extra args
    const modelToUse = defaultModel || getProviderDefaultModel(defaultProvider);

    switch (defaultProvider) {
      case "openrouter":
        await launchOpenRouter(false, extraArgs, modelToUse);
        break;
      case "anthropic":
        await launchAnthropic(false, extraArgs, modelToUse);
        break;
      case "minimax":
        await launchMinimax(false, extraArgs, modelToUse);
        break;
      case "ollama":
        await launchOllama(false, extraArgs, modelToUse);
        break;
      case "original":
        await launchDefault(extraArgs);
        break;
    }
    return;
  }

  if (args.length === 0) {
    // No arguments - use defaults or show help in CLI mode
    await handleCliMode([]);
    return;
  }

  const command = args[0].toLowerCase();
  const showModelMenuParam = args.includes("--model");

  // Check for direct model specification after --model flag
  const modelIndex = args.indexOf("--model");
  let directModel = null;
  if (modelIndex !== -1 && args.length > modelIndex + 1) {
    directModel = args[modelIndex + 1];
  }

  // Filter out our script arguments, pass the rest to Claude
  const extraArgs = args.filter(
    (arg) =>
      arg !== "--model" &&
      arg !== command && // Filter out the provider command
      arg !== directModel && // Filter out the direct model name
      !allProviderAliases.includes(arg), // Filter out all provider aliases
  );

  // Find provider ID from command using helper function
  const providerId = getProviderIdFromCommand(command);

  switch (providerId) {
    case "openrouter":
      await launchOpenRouter(showModelMenuParam, extraArgs, directModel);
      break;

    case "anthropic":
      await launchAnthropic(showModelMenuParam, extraArgs, directModel);
      break;

    case "minimax":
      await launchMinimax(showModelMenuParam, extraArgs, directModel);
      break;

    case "ollama":
      await launchOllama(showModelMenuParam, extraArgs, directModel);
      break;

    case "original":
      await launchDefault(extraArgs);
      break;

    default:
      handleError(new Error(`Unknown command '${command}'`), false);
      return;
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
main(false, false).catch((error) => {
  handleError(error, false);
});
