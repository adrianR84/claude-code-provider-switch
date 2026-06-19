/**
 * Menu system for Claude Code Provider Switcher
 * Uses terminal-menu for interactive TUI menus
 */

const TerminalMenu = require("terminal-menu");
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
 * Create a terminal-menu with options
 * @param {Array<{id: string, label: string}>} options - Menu options
 * @param {Object} opts - Options
 * @param {string} opts.title - Menu title
 * @param {boolean} opts.multiSelect - Allow multiple selections
 * @returns {Promise<{id: string, label: string} | null>} Selected option or null on ESC
 */
function createMenu(options, opts = {}) {
  return new Promise((resolve) => {
    // Reset terminal state
    if (process.stdout.isTTY) {
      process.stdout.write("\x1b[2J\x1b[0f");
    }

    const menu = TerminalMenu({
      width: 40,
      x: 4,
      y: 2,
      style: {
        selected: ["cyan", "bold"],
        item: ["white"],
        title: ["green", "bold"],
      },
      prepend: opts.multiSelect ? "[ ] " : "",
    });

    // Handle ctrl+c
    process.stdin.on("keypress", (str, key) => {
      if (key.ctrl && key.name === "c") {
        menu.close();
        process.exit(0);
      }
    });

    menu.on("close", () => {
      // Clean up raw mode
      if (process.stdin.setRawMode) {
        process.stdin.setRawMode(false);
      }
    });

    menu.on("cancel", () => {
      resolve(null);
    });

    menu.on("select", (label, index) => {
      const selected = options[index];
      menu.close();
      resolve(selected);
    });

    if (opts.title) {
      menu.write(opts.title + "\n");
      menu.write("═══════════════════════════════\n");
    }

    options.forEach((opt) => {
      menu.add(opt.label);
    });

    menu.write("\n");
    menu.write("Press ESC or q to cancel\n");

    process.stdin.pipe(menu.createStream()).pipe(process.stdout);
  });
}

/**
 * Show the provider selection submenu
 * Returns { id, name } of selected provider, or null if cancelled
 */
async function showProviderSubmenu() {
  const { log } = require("./config");

  // Build providers array in constants.js order
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

  const options = providers.map((p) => ({
    id: p.id,
    label: `🌐 ${p.name}`,
  }));

  return await createMenu(options, { title: "Choose Provider" });
}

/**
 * Show model selection for a specific provider
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
 * Show the main provider menu
 * Returns the selected menu option
 */
async function showProviderMenu() {
  // Get current defaults
  const defaultProvider = getDefaultProvider();
  const defaultModel = getDefaultModel();
  const configSource = getConfigurationSource();
  const configPath = getConfigurationPath();

  // Build main menu options
  const menuOptions = [
    {
      id: "choose-provider",
      label: "🌐 Choose Provider",
    },
    {
      id: "set-default",
      label: "⚙️ Set as Default",
    },
  ];

  // Add "Clear Default Provider" option only if defaults are set
  if (defaultProvider && defaultProvider !== null && defaultProvider !== "default") {
    menuOptions.push({
      id: "clear-defaults",
      label: "🗑️ Clear Default Provider",
    });
  }

  menuOptions.push({
    id: "api-keys",
    label: "🔑 Manage API Keys",
  });

  // Add "Save Configuration Locally" option only if global configuration exists
  if (hasGlobalConfiguration()) {
    menuOptions.push({
      id: "save-local",
      label: "💾 Save Configuration Locally",
    });
  }

  // Always add Help at the end
  menuOptions.push({
    id: "help",
    label: "❓ Help",
  });

  // Build header info
  let header = "Claude Code Provider Switcher\n";
  header += "═══════════════════════════════\n";
  header += `Configuration: ${configSource}\n`;
  header += `Path: ${configPath}\n`;

  if (defaultProvider && defaultProvider !== null && defaultProvider !== "default") {
    const currentModel = defaultModel || getProviderDefaultModel(defaultProvider);
    const providerName = {
      openrouter: "OpenRouter",
      anthropic: "Anthropic",
      minimax: "Minimax",
      ollama: "Ollama",
      original: "Original Claude Code",
    }[defaultProvider] || defaultProvider;
    header += `\nCurrent default: ${providerName}${currentModel ? ` (${currentModel})` : ""}`;
  }

  const selected = await createMenu(menuOptions, { title: header });
  return selected;
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
  const { log } = require("./config");
  const readline = require("readline");

  log("", "reset");
  log("Setup Default Provider and Model", "green");
  log("", "reset");

  // Provider selection
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

  const originalConfig = getProviderConfig("original");
  if (originalConfig && originalConfig.aliases) {
    providers.push({
      id: "original",
      name: "Original Claude Code",
    });
  }

  const options = providers.map((p) => ({
    id: p.id,
    label: p.name,
  }));

  const selectedProvider = await createMenu(options, {
    title: "Setup Default Provider and Model\nSelect a provider:",
  });

  if (!selectedProvider) {
    log("Setup cancelled.", "yellow");
    return;
  }

  setDefaultProvider(selectedProvider.id);

  // Model selection
  if (selectedProvider.id !== "default") {
    log("", "reset");
    log(`Fetching available models for ${selectedProvider.name}...`, "yellow");

    let selectedModel;

    try {
      switch (selectedProvider.id) {
        case "openrouter": {
          const { loadEnvFile } = require("./config");
          const envVars = loadEnvFile();
          if (!envVars[ENV_VARS.OPENROUTER_AUTH_TOKEN]) {
            log("OpenRouter auth token required for model selection", "red");
            log("Please set " + ENV_VARS.OPENROUTER_AUTH_TOKEN + " in .env file", "yellow");
            log("", "reset");
            const rl = readline.createInterface({
              input: process.stdin,
              output: process.stdout,
            });
            const modelAnswer = await new Promise((resolve) => {
              rl.question(
                `Enter model name (leave empty for ${getProviderDefaultModel(selectedProvider.id)}): `,
                resolve,
              );
            });
            rl.close();
            selectedModel = modelAnswer.trim() || getProviderDefaultModel(selectedProvider.id);
          } else {
            selectedModel = await showOpenRouterModelSelection();
          }
          break;
        }

        case "ollama":
          selectedModel = await showOllamaModelSelection();
          break;

        case "anthropic":
          selectedModel = await showAnthropicModelSelection();
          break;

        case "minimax":
          selectedModel = await showMinimaxModelSelection();
          break;

        default:
          selectedModel = getProviderDefaultModel(selectedProvider.id);
      }
    } catch (error) {
      log(`Error fetching models: ${error.message}`, "red");
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
