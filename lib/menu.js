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
} = require("./config");
const {
  showModelSelection: showOpenRouterModelSelection,
} = require("./openrouter");
const { showModelSelection: showOllamaModelSelection } = require("./ollama");
const {
  showModelSelection: showAnthropicModelSelection,
} = require("./anthropic");

/**
 * Show model selection for a specific provider after main menu selection
 */
async function showModelSelectionForProvider(provider) {
  const { loadEnvFile } = require("./config");
  const envVars = loadEnvFile();

  switch (provider.id) {
    case "openrouter":
      if (!envVars.OPENROUTER_AUTH_TOKEN) {
        log("OpenRouter auth token required for model selection", "red");
        log("Please set OPENROUTER_AUTH_TOKEN in .env file", "yellow");
        log("Using default model...", "yellow");
        return getProviderDefaultModel("openrouter");
      }
      return await showOpenRouterModelSelection();

    case "ollama":
      return await showOllamaModelSelection();

    case "anthropic":
      return await showAnthropicModelSelection();

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

  // Get current defaults
  const defaultProvider = getDefaultProvider();
  const defaultModel = getDefaultModel();

  const providers = [
    {
      id: "openrouter",
      name: "OpenRouter",
      aliases: ["openrouter", "or", "open"],
    },
    { id: "ollama", name: "Ollama", aliases: ["ollama", "oll"] },
    { id: "anthropic", name: "Anthropic", aliases: ["anthropic", "ant"] },
    {
      id: "original",
      name: "Original Claude Code",
      aliases: ["original", "orig", "def", "d"],
    },
    { id: "set-default", name: "Set as Default", aliases: ["set-default"] },
    { id: "help", name: "Help", aliases: ["help", "-h", "--help"] },
  ];

  let selectedIndex = 0;

  function displayMenu() {
    console.clear();
    log("Claude Code Provider Switcher", "green");
    log("", "reset");

    // Show current defaults
    if (defaultProvider && defaultProvider !== "default") {
      const providerName =
        providers.find((p) => p.id === defaultProvider)?.name ||
        defaultProvider;
      const currentModel =
        defaultModel || getProviderDefaultModel(defaultProvider);
      log(
        `Current default: ${providerName}${currentModel ? ` (${currentModel})` : ""}`,
        "yellow",
      );
    } else {
      log("No default provider set", "yellow");
    }
    log("", "reset");

    log("Available providers:", "yellow");
    log("", "reset");

    providers.forEach((provider, index) => {
      const marker = index === selectedIndex ? "❯" : " ";
      const isDefault = provider.id === defaultProvider;
      const defaultIndicator = isDefault ? " [DEFAULT]" : "";
      const isSetDefaultOption = provider.id === "set-default";
      const aliases =
        provider.aliases.length > 0
          ? `    Aliases: (${provider.aliases.join(", ")})`
          : "";

      // Highlight "Set as Default" option in blue to make it stand out
      const color =
        index === selectedIndex
          ? "green"
          : isSetDefaultOption
            ? "blue"
            : "reset";

      log(
        `${marker} ${index + 1}) ${provider.name}${defaultIndicator}${aliases}`,
        color,
      );
    });

    log("", "reset");
    log("Controls:", "yellow");
    log("↑/↓ - Navigate", "reset");
    log("Enter - Select provider", "reset");
    log("1-6 - Quick select", "reset");
    log("ESC - Exit", "reset");
    log("", "reset");

    // Add helpful usage text
    log("💡 Quick Start:", "cyan");
    log("• Use ↑/↓ arrows to navigate providers", "reset");
    log("• Press Enter to launch selected provider", "reset");
    log("• Use 'Set as Default' to save your preferred provider", "reset");
    log("• Type 'claude-switch --help' for more options", "reset");
    log("", "reset");
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
        rl.close();
        log("Exiting...", "yellow");
        process.exit(0);
      } else if (key.name === "return") {
        // Clean up event listeners before resolving
        process.stdin.removeAllListeners("keypress");
        rl.close();
        resolve(providers[selectedIndex]);
      } else if (str && /^[1-6]$/.test(str)) {
        const index = parseInt(str) - 1;
        if (index >= 0 && index < providers.length) {
          selectedIndex = index;
          // Clean up event listeners before resolving
          process.stdin.removeAllListeners("keypress");
          rl.close();
          resolve(providers[selectedIndex]);
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

  // Provider selection
  const providers = [
    { id: "openrouter", name: "OpenRouter" },
    { id: "ollama", name: "Ollama" },
    { id: "anthropic", name: "Anthropic" },
    { id: "original", name: "Original Claude Code" },
  ];

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
    log("1-4 - Quick select", "reset");
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
      } else if (str && /^[1-4]$/.test(str)) {
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
          if (!envVars.OPENROUTER_AUTH_TOKEN) {
            log("OpenRouter auth token required for model selection", "red");
            log("Please set OPENROUTER_AUTH_TOKEN in .env file", "yellow");
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
  log("Usage: claude-switch [provider] [--model [model_name]]", "reset");
  log("", "reset");
  log("Providers:", "reset");
  log("  openrouter  - Launch Claude Code with OpenRouter settings", "reset");
  log("  anthropic   - Launch Claude Code with Anthropic settings", "reset");
  log("  ollama      - Launch Claude Code with Ollama settings", "reset");
  log("  default     - Launch Claude Code with default settings", "reset");
  log("", "reset");
  log("Management Commands:", "reset");
  log(
    "  set-default      - Interactive setup for default provider and model",
    "reset",
  );
  log("  show-defaults    - Display current default settings", "reset");
  log("  clear-defaults   - Reset all default settings", "reset");
  log("", "reset");
  log("Options:", "reset");
  log("  --model            - Show interactive model selection menu", "reset");
  log(
    "  --model <name>     - Use best matching model (e.g., --model gpt4)",
    "reset",
  );
  log("  --help             - Show this help message", "reset");
  log("", "reset");
  log("Examples:", "reset");
  log("  claude-switch                    - Use default or show menu", "reset");
  log(
    "  claude-switch set-default         - Setup default provider/model",
    "reset",
  );
  log("  claude-switch show-defaults       - View current defaults", "reset");
  log("  claude-switch openrouter --model", "reset");
  log("  claude-switch ollama --model llama", "reset");
  log("  claude-switch openrouter --model gpt-4", "reset");
  log("", "reset");
  log(
    "Run without arguments to use default settings or show interactive menu.",
    "reset",
  );
  log("", "reset");
}

module.exports = {
  showProviderMenu,
  showUsage,
  showDefaults,
  setupDefaults,
  showModelSelectionForProvider,
};
