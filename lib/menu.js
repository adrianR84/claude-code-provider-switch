/**
 * Menu system for Claude Code Provider Switcher
 */

const {
  log,
  getDefaultProvider,
  getDefaultModel,
  getProviderDefaultModel,
  setDefaultProvider,
  setDefaultModel,
  showApiKeyMenu,
  getConfigurationSource,
  getConfigurationPath,
  hasGlobalConfiguration,
} = require("./config");
const { ENV_VARS, PROVIDERS, getProviderConfig } = require("./constants");
const {
  showModelSelection: showOpenRouterModelSelection,
} = require("./openrouter");
const { showModelSelection: showOllamaModelSelection } = require("./ollama");
const {
  showModelSelection: showAnthropicModelSelection,
} = require("./anthropic");
const { showModelSelection: showMinimaxModelSelection } = require("./minimax");

/**
 * Show the provider selection submenu (called when user selects "Choose Provider")
 * Returns { id, name } of selected provider
 */
function showProviderSubmenu() {
  const readline = require("readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const { log } = require("./config");
  const { PROVIDERS, getProviderConfig } = require("./constants");

  // Build providers array in constants.js order (excluding 'original' management entry)
  const providers = [];
  Object.keys(PROVIDERS).forEach((providerId) => {
    const config = getProviderConfig(providerId);
    if (config && config.aliases && providerId !== "original") {
      providers.push({
        id: providerId,
        name: providerId.charAt(0).toUpperCase() + providerId.slice(1),
      });
    }
  });
  // Add "original" at the end
  const originalConfig = getProviderConfig("original");
  if (originalConfig && originalConfig.aliases) {
    providers.push({
      id: "original",
      name: "Original Claude Code",
    });
  }

  let selectedIndex = 0;

  function displaySubmenu() {
    console.clear();
    log("Choose Provider", "green");
    log("", "reset");
    log("Select a provider:", "yellow");
    log("", "reset");

    providers.forEach((provider, index) => {
      const marker = index === selectedIndex ? "❯" : " ";
      log(
        `${marker} ${index + 1}) 🌐 ${provider.name}`,
        index === selectedIndex ? "green" : "reset",
      );
    });

    log("", "reset");
    log("Controls:", "cyan");
    log("↑/↓ - Navigate", "reset");
    log("Enter - Select", "reset");
    log("ESC - Back to main menu", "reset");
    log("", "reset");
  }

  displaySubmenu();

  return new Promise((resolve) => {
    const handleKeyPress = (str, key) => {
      if (key.name === "up") {
        selectedIndex = (selectedIndex - 1 + providers.length) % providers.length;
        displaySubmenu();
      } else if (key.name === "down") {
        selectedIndex = (selectedIndex + 1) % providers.length;
        displaySubmenu();
      } else if (key.name === "escape") {
        process.stdin.removeAllListeners("keypress");
        rl.close();
        resolve(null); // Return null to indicate "back"
      } else if (key.name === "return") {
        process.stdin.removeAllListeners("keypress");
        rl.close();
        resolve(providers[selectedIndex]);
      } else if (str && /^[1-5]$/.test(str)) {
        const index = parseInt(str) - 1;
        if (index >= 0 && index < providers.length) {
          selectedIndex = index;
          process.stdin.removeAllListeners("keypress");
          rl.close();
          resolve(providers[selectedIndex]);
        }
      }
    };

    if (process.stdin.setRawMode) {
      process.stdin.setRawMode(true);
    }
    readline.emitKeypressEvents(process.stdin);
    process.stdin.on("keypress", handleKeyPress);
    rl.question("", () => {});
  });
}

/**
 * Show model selection for a specific provider after main menu selection
 */
async function showModelSelectionForProvider(provider) {
  const { loadEnvFile } = require("./config");
  const envVars = loadEnvFile();

  switch (provider.id) {
    case "openrouter":
      return await showOpenRouterModelSelection();

    case "ollama":
      return await showOllamaModelSelection();

    case "anthropic":
      return await showAnthropicModelSelection();

    case "minimax":
      return await showMinimaxModelSelection();

    case "original":
      return ""; // Original provider has no model selection

    default:
      return getProviderDefaultModel(provider.id);
  }
}

/**
 * Show interactive provider selection menu
 */
function showProviderMenu() {
  const readline = require("readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  // Get current defaults and configuration source
  const defaultProvider = getDefaultProvider();
  const defaultModel = getDefaultModel();
  const configSource = getConfigurationSource();

  // Main menu options
  const menuOptions = [
    {
      id: "choose-provider",
      name: "Choose Provider",
      aliases: ["choose-provider", "choose", "provider"],
    },
    {
      id: "set-default",
      name: "Set as Default",
      aliases: ["set-default"],
    },
  ];

  // Add "Clear Default Provider" option only if defaults are set
  if (
    defaultProvider &&
    defaultProvider !== null &&
    defaultProvider !== "default"
  ) {
    menuOptions.push({
      id: "clear-defaults",
      name: "Clear Default Provider",
      aliases: ["clear-defaults", "clear"],
    });
  }

  menuOptions.push({
    id: "api-keys",
    name: "Manage API Keys",
    aliases: ["api-keys", "keys"],
  });

  // Add "Save Configuration Locally" option only if global configuration exists
  if (hasGlobalConfiguration()) {
    menuOptions.push({
      id: "save-local",
      name: "Save Configuration Locally",
      aliases: ["save-local", "local", "save-locally"],
    });
  }

  // Always add Help at the end
  menuOptions.push({
    id: "help",
    name: "Help",
    aliases: ["help", "-h", "--help"],
  });

  let selectedIndex = 0;

  function displayMenu() {
    console.clear();
    log("Claude Code Provider Switcher", "green");
    log("", "reset");

    // Show configuration source with file path
    const configSource = getConfigurationSource();
    const configPath = getConfigurationPath();
    log(`Configuration: ${configSource} (${configPath})`, "cyan");
    log("", "reset");

    // Show current defaults
    if (
      defaultProvider &&
      defaultProvider !== null &&
      defaultProvider !== "default"
    ) {
      const currentModel =
        defaultModel || getProviderDefaultModel(defaultProvider);
      const providerName = {
        openrouter: "OpenRouter",
        anthropic: "Anthropic",
        minimax: "Minimax",
        ollama: "Ollama",
        original: "Original Claude Code",
      }[defaultProvider] || defaultProvider;
      log(
        `Current default: ${providerName}${currentModel ? ` (${currentModel})` : ""}`,
        "yellow",
      );
      log("", "reset");
    }

    log("Options:", "yellow");
    log("", "reset");

    menuOptions.forEach((option, index) => {
      const marker = index === selectedIndex ? "❯" : " ";
      const isSetDefaultOption = option.id === "set-default";
      const isApiKeysOption = option.id === "api-keys";
      const isClearDefaultsOption = option.id === "clear-defaults";
      const isSaveLocalOption = option.id === "save-local";
      const isHelpOption = option.id === "help";
      const isChooseProvider = option.id === "choose-provider";

      // Get icon for each option
      const getIcon = (id) => {
        switch (id) {
          case "choose-provider":
            return "🌐";
          case "set-default":
            return "⚙️";
          case "clear-defaults":
            return "🗑️";
          case "api-keys":
            return "🔑";
          case "save-local":
            return "💾";
          case "help":
            return "❓";
          default:
            return "📋";
        }
      };

      const icon = getIcon(option.id);
      const aliases =
        option.aliases.length > 0
          ? ` (${option.aliases.join(", ")})`
          : "";

      // Color scheme
      const color =
        index === selectedIndex
          ? "green"
          : isSetDefaultOption
            ? "orange"
            : isApiKeysOption
              ? "cyan"
              : isClearDefaultsOption
                ? "red"
                : isSaveLocalOption
                  ? "magenta"
                  : isHelpOption
                    ? "blue"
                    : "reset";

      log(
        `${marker} ${index + 1}) ${icon} ${option.name}${aliases}`,
        color,
      );
    });

    log("", "reset");
    log("🎯 Navigation:", "cyan");
    log("  • Use ↑/↓ arrows to navigate", "reset");
    log("  • Press Enter to select", "reset");
    log("  • Press ESC to exit", "reset");
    log("", "reset");
  }

  displayMenu();

  return new Promise((resolve) => {
    const handleKeyPress = (str, key) => {
      if (key.name === "up") {
        selectedIndex =
          (selectedIndex - 1 + menuOptions.length) % menuOptions.length;
        displayMenu();
      } else if (key.name === "down") {
        selectedIndex = (selectedIndex + 1) % menuOptions.length;
        displayMenu();
      } else if (key.name === "escape") {
        rl.close();
        log("Exiting...", "yellow");
        process.exit(0);
      } else if (key.name === "return") {
        // Clean up event listeners before resolving
        process.stdin.removeAllListeners("keypress");
        rl.close();
        resolve(menuOptions[selectedIndex]);
      } else if (str && /^[1-9]$/.test(str)) {
        const index = parseInt(str) - 1;
        if (index >= 0 && index < menuOptions.length) {
          selectedIndex = index;
          // Clean up event listeners before resolving
          process.stdin.removeAllListeners("keypress");
          rl.close();
          resolve(menuOptions[selectedIndex]);
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
 * Show current defaults
 */
function showDefaults() {
  const defaultProvider = getDefaultProvider();
  const defaultModel = getDefaultModel();

  log("Current Defaults:", "green");
  log("", "reset");

  if (defaultProvider && defaultProvider !== "original") {
    const providerName =
      {
        openrouter: "OpenRouter",
        anthropic: "Anthropic",
        ollama: "Ollama",
        original: "Original Claude Code",
      }[defaultProvider] || defaultProvider;

    log(`Provider: ${providerName}`, "yellow");

    const currentModel =
      defaultModel || getProviderDefaultModel(defaultProvider);
    if (currentModel) {
      log(`Model: ${currentModel}`, "yellow");
    } else {
      log("Model: (provider default)", "yellow");
    }
  } else {
    log("No default provider set", "yellow");
    log("Use 'claude-switch set-default' to configure", "reset");
  }

  log("", "reset");
}

/**
 * Interactive default setup
 */
async function setupDefaults() {
  const readline = require("readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  log("", "reset");
  log("Setup Default Provider and Model", "green");
  log("", "reset");

  // Provider selection - use same order as main menu (from constants.js)
  const providers = [];

  // Add actual providers from PROVIDERS object (in the order they appear in constants.js)
  Object.keys(PROVIDERS).forEach((providerId) => {
    const config = getProviderConfig(providerId);
    if (config && config.aliases && providerId !== "original") {
      providers.push({
        id: providerId,
        name: providerId.charAt(0).toUpperCase() + providerId.slice(1),
      });
    }
  });

  // Add "original" provider at the end to maintain current menu structure
  const originalConfig = getProviderConfig("original");
  if (originalConfig && originalConfig.aliases) {
    providers.push({
      id: "original",
      name: "Original Claude Code",
    });
  }

  let selectedIndex = 0;

  function displayProviderMenu() {
    console.clear();
    log("Setup Default Provider and Model", "green");
    log("", "reset");

    log("Available providers:", "yellow");
    log("", "reset");

    providers.forEach((provider, index) => {
      const marker = index === selectedIndex ? "❯" : " ";
      log(
        `${marker} ${index + 1}) ${provider.name}`,
        index === selectedIndex ? "green" : "reset",
      );
    });

    log("", "reset");
    log("Controls:", "yellow");
    log("↑/↓ - Navigate", "reset");
    log("Enter - Select provider", "reset");
    log("1-5 - Quick select", "reset");
    log("ESC - Exit", "reset");
    log("", "reset");
  }

  displayProviderMenu();

  const selectedProvider = await new Promise((resolve) => {
    const handleKeyPress = (str, key) => {
      if (key.name === "up") {
        selectedIndex =
          (selectedIndex - 1 + providers.length) % providers.length;
        displayProviderMenu();
      } else if (key.name === "down") {
        selectedIndex = (selectedIndex + 1) % providers.length;
        displayProviderMenu();
      } else if (key.name === "escape") {
        // Clean up event listeners before resolving
        process.stdin.removeAllListeners("keypress");
        rl.close();
        resolve(null);
        return;
      } else if (key.name === "return") {
        // Clean up event listeners before resolving
        process.stdin.removeAllListeners("keypress");
        rl.close();
        resolve(providers[selectedIndex]);
        return;
      } else if (str && /^[1-5]$/.test(str)) {
        const index = parseInt(str) - 1;
        if (index >= 0 && index < providers.length) {
          selectedIndex = index;
          // Clean up event listeners before resolving
          process.stdin.removeAllListeners("keypress");
          rl.close();
          resolve(providers[index]);
          return;
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

  if (!selectedProvider) {
    log("Setup cancelled.", "yellow");
    return;
  }

  setDefaultProvider(selectedProvider.id);

  // Create new readline interface for model selection
  const modelRl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  // Model selection (skip for default provider)
  if (selectedProvider.id !== "default") {
    log("", "reset");
    log(`Fetching available models for ${selectedProvider.name}...`, "yellow");

    let selectedModel;

    try {
      switch (selectedProvider.id) {
        case "openrouter":
          // Need auth token for OpenRouter
          const { loadEnvFile } = require("./config");
          const envVars = loadEnvFile();
          if (!envVars[ENV_VARS.OPENROUTER_AUTH_TOKEN]) {
            log("OpenRouter auth token required for model selection", "red");
            log(
              "Please set " + ENV_VARS.OPENROUTER_AUTH_TOKEN + " in .env file",
              "yellow",
            );
            log("", "reset");
            const modelAnswer = await new Promise((resolve) => {
              modelRl.question(
                `Enter model name (leave empty for ${getProviderDefaultModel(selectedProvider.id)}): `,
                resolve,
              );
            });
            selectedModel =
              modelAnswer.trim() ||
              getProviderDefaultModel(selectedProvider.id);
          } else {
            // Close current interface before creating new one
            modelRl.close();
            log("", "reset");

            // Create fresh readline interface for model selection
            selectedModel = await showOpenRouterModelSelection();

            // Create new readline for remaining input
            const newRl = readline.createInterface({
              input: process.stdin,
              output: process.stdout,
            });

            const continueAnswer = await new Promise((resolve) => {
              newRl.question("Press Enter to continue...", resolve);
            });
            newRl.close();
          }
          break;

        case "ollama":
          // Close current interface before creating new one
          modelRl.close();
          log("", "reset");

          // Create fresh readline interface for model selection
          selectedModel = await showOllamaModelSelection();

          // Create new readline for remaining input
          const newRl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
          });

          const continueAnswer = await new Promise((resolve) => {
            newRl.question("Press Enter to continue...", resolve);
          });
          newRl.close();
          break;

        case "anthropic":
          // Use proper API model selection
          selectedModel = await showAnthropicModelSelection();
          break;

        case "minimax":
          // Use proper API model selection
          selectedModel = await showMinimaxModelSelection();
          break;

        default:
          selectedModel = getProviderDefaultModel(selectedProvider.id);
      }
    } catch (error) {
      log(`Error fetching models: ${error.message}`, "red");
      log(
        `Using default model: ${getProviderDefaultModel(selectedProvider.id)}`,
        "yellow",
      );
      selectedModel = getProviderDefaultModel(selectedProvider.id);
    }

    setDefaultModel(selectedModel);
  } else {
    setDefaultModel("");
  }

  log("", "reset");
  log("Default configuration saved!", "green");
  log("Run 'claude-switch' to use your default setup", "yellow");
  log("", "reset");

  modelRl.close();
}

/**
 * Show usage information
 */
function showUsage() {
  log(
    "Usage: claude-switch [command] [provider] [--model [model_name]]",
    "reset",
  );
  log("", "reset");
  log("Commands:", "reset");
  log("  ui                - Show interactive menu (UI mode)", "reset");
  log("", "reset");
  log("Providers (CLI shortcuts):", "reset");
  log("  openrouter  - Launch Claude Code with OpenRouter settings", "reset");
  log("  anthropic   - Launch Claude Code with Anthropic settings", "reset");
  log("  minimax     - Launch Claude Code with Minimax settings", "reset");
  log("  ollama      - Launch Claude Code with Ollama settings", "reset");
  log("  original     - Launch Claude Code with original settings", "reset");
  log("", "reset");
  log("Management Commands:", "reset");
  log(
    "  set-default      - Interactive setup for default provider and model",
    "reset",
  );
  log("  show-defaults    - Display current default settings", "reset");
  log("  clear-defaults   - Reset all default settings", "reset");
  log("  api-keys         - Manage API keys for providers", "reset");
  log(
    "  save-local       - Save global configuration to local .env file",
    "reset",
  );
  log("", "reset");
  log("Options:", "reset");
  log("  --model            - Show interactive model selection menu", "reset");
  log(
    "  --model <name>     - Use best matching model (e.g., --model gpt4)",
    "reset",
  );
  log("  --version, -v      - Show version number", "reset");
  log("  --help             - Show this help message", "reset");
  log("", "reset");
  log("Examples:", "reset");
  log("  claude-switch ui                  - Show interactive menu", "reset");
  log(
    "  claude-switch                     - Use default settings or show help",
    "reset",
  );
  log(
    "  claude-switch set-default         - Setup default provider/model",
    "reset",
  );
  log("  claude-switch show-defaults       - View current defaults", "reset");
  log("  claude-switch openrouter          - Use OpenRouter provider", "reset");
  log("  claude-switch minimax              - Use Minimax provider", "reset");
  log("  claude-switch openrouter --model", "reset");
  log("  claude-switch ollama --model llama", "reset");
  log("  claude-switch minimax --model m2.7", "reset");
  log("  claude-switch openrouter --model gpt-4", "reset");
  log("  claude-switch --version            - Show version number", "reset");
  log("", "reset");
  log(
    "Run 'claude-switch ui' for interactive menu mode, or use any provider/command for CLI mode.",
    "reset",
  );
  log("", "reset");
}

module.exports = {
  showProviderMenu,
  showProviderSubmenu,
  showUsage,
  showDefaults,
  setupDefaults,
  showModelSelectionForProvider,
};
