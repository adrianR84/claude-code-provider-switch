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
} = require("../lib/config");

/**
 * Handle post-configuration actions
 */
function handlePostConfiguration(action = "restart") {
  const { log } = require("../lib/config");

  if (action === "restart") {
    log("Configuration saved! Restarting application...", "green");
    log("", "reset");

    // Simulate restart by calling main() again to use defaults
    setTimeout(() => {
      main().catch((error) => {
        const { log } = require("../lib/config");
        log(`Error: ${error.message}`, "red");
        process.exit(1);
      });
    }, 1000); // Short delay for user to see message
  } else if (action === "menu") {
    log("Defaults cleared! Returning to main menu...", "green");
    log("", "reset");

    // Return to main menu by forcing menu mode
    setTimeout(() => {
      main(true).catch((error) => {
        const { log } = require("../lib/config");
        log(`Error: ${error.message}`, "red");
        process.exit(1);
      });
    }, 1000);
  }
}

/**
 * Main application logic
 */
async function main(forceMenu = false) {
  const args = forceMenu ? [] : process.argv.slice(2);

  // Handle special commands first
  if (args[0] === "set-default") {
    await setupDefaults();
    handlePostConfiguration("restart");
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
    handlePostConfiguration("menu");
    return;
  }

  if (args.length === 0) {
    // Check for default provider first
    const defaultProvider = getDefaultProvider();
    const defaultModel = getDefaultModel();

    if (defaultProvider && defaultProvider !== "default") {
      const { log } = require("../lib/config");
      log(
        `Using default: ${defaultProvider}${defaultModel ? ` (${defaultModel})` : ""}`,
        "green",
      );

      // Launch default provider with default model
      const modelToUse =
        defaultModel || getProviderDefaultModel(defaultProvider);

      switch (defaultProvider) {
        case "openrouter":
          await launchOpenRouter(false, [], modelToUse);
          break;
        case "anthropic":
          await launchAnthropic(false, [], modelToUse);
          break;
        case "ollama":
          await launchOllama(false, [], modelToUse);
          break;
        case "original":
          await launchDefault([]);
          break;
      }
      return;
    }

    // No defaults set, show interactive menu
    const selectedProvider = await showProviderMenu();

    // Handle special menu options
    switch (selectedProvider.id) {
      case "help":
        showUsage();
        return;
      case "set-default":
        await setupDefaults();
        handlePostConfiguration("restart");
        return;
      case "show-defaults":
        showDefaults();
        return;
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
      case "ollama":
        await launchOllama(false, [], selectedModel);
        break;
      case "original":
        await launchDefault([]);
        break;
    }
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
      arg !== "openrouter" &&
      arg !== "anthropic" &&
      arg !== "ollama" &&
      arg !== "default" &&
      arg !== "or" &&
      arg !== "open" &&
      arg !== "ant" &&
      arg !== "oll" &&
      arg !== "def" &&
      arg !== "d" &&
      arg !== directModel, // Filter out the direct model name
  );

  switch (command) {
    case "openrouter":
    case "or":
    case "open":
      await launchOpenRouter(showModelMenuParam, extraArgs, directModel);
      break;

    case "anthropic":
    case "ant":
      await launchAnthropic(showModelMenuParam, extraArgs, directModel);
      break;

    case "ollama":
    case "oll":
      await launchOllama(showModelMenuParam, extraArgs, directModel);
      break;

    case "original":
    case "def":
    case "d":
      await launchDefault(extraArgs);
      break;

    case "help":
    case "-h":
    case "--help":
      showUsage();
      break;

    default:
      const { log } = require("../lib/config");
      log(`Error: Unknown command '${command}'`, "red");
      log("", "reset");
      showUsage();
      process.exit(1);
  }
}

// Handle uncaught errors
process.on("uncaughtException", (error) => {
  const { log } = require("../lib/config");
  log(`Uncaught error: ${error.message}`, "red");
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  const { log } = require("../lib/config");
  log(`Unhandled rejection: ${reason}`, "red");
  process.exit(1);
});

// Run the application
main().catch((error) => {
  const { log } = require("../lib/config");
  log(`Error: ${error.message}`, "red");
  process.exit(1);
});
