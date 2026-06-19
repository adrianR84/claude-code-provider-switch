/**
 * Menu system for Claude Code Provider Switcher
 */

// Track if stdin keypress events have been set up
let stdinKeypressSetup = false;

/**
 * Strip ANSI color/escape sequences so we measure visible character count,
 * not raw byte count (which would make the box ~8 chars too wide).
 */
function stripAnsi(str) {
  return str.replace(/\x1b\[[0-9;]*m/g, "");
}

/**
 * Wrap content lines in a unicode box frame with a title in the top border.
 * Width auto-fits the longest line. Content is left-aligned with one space padding.
 * @param {string} title - Title shown in the top border (supports ANSI color codes)
 * @param {string[]} contentLines - Lines to render inside the box
 * @returns {string} The boxed content as a multi-line string
 */
function buildBox(title, contentLines) {
  const plainTitle = stripAnsi(title);
  const titleSegment = `─ ${plainTitle} `;
  const innerWidth = Math.max(
    titleSegment.length,
    ...contentLines.map((l) => stripAnsi(l).length)
  );

  const trailingDashes = Math.max(0, innerWidth - titleSegment.length);
  const top = `┌${titleSegment}${"─".repeat(trailingDashes)}┐`;

  // Build coloredTop by replacing only the title-area in top (not the border ┌)
  const coloredTitleSegment = `\x1b[32m ${plainTitle} \x1b[0m`;
  const coloredTop = `┌${coloredTitleSegment}${"─".repeat(trailingDashes)}┐`;

  const content = contentLines.map((line) => {
    const plainLen = stripAnsi(line).length;
    const padding = Math.max(0, innerWidth - plainLen);
    return `│ ${line}${" ".repeat(padding)} │`;
  });

  const bottom = `└${"─".repeat(innerWidth)}┘`;

  return [coloredTop, ...content, bottom].join("\n");
}

const readline = require("readline");
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
 * Generic interactive menu with arrow navigation and numbered selection
 * @param {Array} options - Menu options with {id, name, icon}
 * @param {Object} opts - Menu configuration
 * @param {string} opts.title - Menu title
 * @param {string} opts.subtitle - Optional subtitle
 * @param {string} opts.footer - Optional footer text
 * @param {boolean} opts.showNumbers - Show numbered options (default true)
 * @param {boolean} opts.showBack - Show back option (default false)
 * @param {string} opts.backText - Text for back option
 * @param {boolean} opts.colorful - Use colors (default false for discrete look)
 * @returns {Promise<Object|null>} Selected option or null if cancelled/back
 */
function createInteractiveMenu(options, opts = {}) {
  const {
    title = "",
    subtitle = "",
    footer = "↑/↓ Navigate | Enter Select | ESC Cancel",
    showNumbers = true,
    showBack = false,
    backText = "Back",
    colorful = false,
    onCancel = null,
  } = opts;

  return new Promise((resolve) => {
    let selectedIndex = 0;
    const totalOptions = showBack ? options.length + 1 : options.length;
    const separatorAfter = opts.separatorAfter ?? -1;

    function getItemAt(index) {
      if (showBack && index === options.length) return null;
      return options[index];
    }

    function display() {
      console.clear();
      if (title) {
        console.log(title);
        console.log("");
      }
      if (subtitle) {
        console.log(subtitle);
        console.log("");
      }

      options.forEach((option, index) => {
        const selected = index === selectedIndex;
        const marker = selected ? "❯" : " ";
        const num = showNumbers ? `${index + 1})` : "";
        const icon = option.icon ? `${option.icon} ` : "";
        const name = selected && colorful ? `\x1b[32m${option.name}\x1b[0m` : option.name;
        console.log(`${marker} ${num} ${icon}${name}`);

        // Add separator after specified index
        if (index === separatorAfter) {
          console.log("");
        }
      });

      if (showBack) {
        const selected = selectedIndex === options.length;
        const marker = selected ? "❯" : " ";
        const num = showNumbers ? `${options.length + 1})` : "";
        const text = selected && colorful ? `\x1b[36m${backText}\x1b[0m` : backText;
        console.log(`${marker} ${num} ${text}`);
      }

      if (footer) {
        console.log("");
        console.log(footer);
      }
    }

    function cleanup() {
      process.stdin.removeAllListeners("keypress");
      if (rl && !rl.closed) {
        try { rl.close(); } catch (_) { /* ignore */ }
      }
      if (process.stdin.setRawMode) {
        process.stdin.setRawMode(false);
      }
    }

    // Keep a readline interface alive while we listen for keypresses.
    // Without it, readline's internal parser (ESC-delay state machine etc.)
    // can get stuck after multiple setRawMode cycles — exactly the bug we
    // saw when entering the same submenu twice. Restoring this from the
    // pre-refactor implementation fixes it.
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false,
    });
    // Keep the interface "open" with a question that never resolves until
    // we call rl.close() in cleanup. This is the same hack the original
    // code used; it forces readline to keep parsing stdin.
    rl.question("", () => {});

    const handleKeyPress = (str, key) => {
      try {
        // Handle ctrl+c
        if (key && key.ctrl && key.name === "c") {
          cleanup();
          console.log("\nExiting...");
          process.exit(0);
          return;
        }

        // Fallback for ESC: readline sometimes emits the ESC keypress with
        // key.name set but other times just with str="\x1b" — handle both.
        const isEscape =
          (key && (key.name === "escape" || key.name === "esc")) ||
          str === "\x1b" ||
          (key && key.sequence === "\x1b");

        if (isEscape) {
          cleanup();
          if (onCancel) onCancel();
          resolve(null);
          return;
        }

        if (key && key.name === "up") {
          selectedIndex = (selectedIndex - 1 + totalOptions) % totalOptions;
          display();
        } else if (key && key.name === "down") {
          selectedIndex = (selectedIndex + 1) % totalOptions;
          display();
        } else if (key && key.name === "return") {
          const item = getItemAt(selectedIndex);
          cleanup();
          resolve(item);
        } else if (str && /^[1-9]$/.test(str)) {
          const index = parseInt(str) - 1;
          if (index >= 0 && index < totalOptions) {
            selectedIndex = index;
            const item = getItemAt(selectedIndex);
            cleanup();
            resolve(item);
          }
        }
      } catch (err) {
        // Never let a keypress handler exception wedge the menu.
        console.error("Keypress handler error:", err && err.message);
      }
    };

    if (process.stdin.setRawMode) {
      process.stdin.setRawMode(true);
    }
    // Ensure data is flowing on stdin — setRawMode alone doesn't always
    // resume the stream, especially after multiple cycles.
    if (typeof process.stdin.resume === "function") {
      process.stdin.resume();
    }

    // Only emit keypress events once per stdin
    if (!stdinKeypressSetup) {
      readline.emitKeypressEvents(process.stdin);
      stdinKeypressSetup = true;
    }

    process.stdin.on("keypress", handleKeyPress);
    display();
  });
}

/**
 * Show the provider selection submenu
 * Returns { id, name } of selected provider, or null if cancelled
 */
async function showProviderSubmenu() {
  // Build providers array in constants.js order
  const providers = [];
  Object.keys(PROVIDERS).forEach((providerId) => {
    const config = getProviderConfig(providerId);
    if (config && config.aliases && providerId !== "original") {
      providers.push({
        id: providerId,
        name: providerId.charAt(0).toUpperCase() + providerId.slice(1),
        icon: "🌐",
      });
    }
  });

  // Add "original" at the end
  const originalConfig = getProviderConfig("original");
  if (originalConfig && originalConfig.aliases) {
    providers.push({
      id: "original",
      name: "Original Claude Code",
      icon: "🌐",
    });
  }

  // Mark default provider
  const defaultProvider = getDefaultProvider();
  providers.forEach(p => {
    if (p.id === defaultProvider) {
      p.hint = " ⭐";
    }
  });

  return createInteractiveMenu(providers, {
    title: "Choose Provider",
    subtitle: "Select a provider to use:",
    showBack: true,
    backText: "Back to Main Menu",
    colorful: true,
  });
}

/**
 * Map provider id to display name
 */
function getProviderName(providerId) {
  return (
    {
      openrouter: "OpenRouter",
      anthropic: "Anthropic",
      minimax: "Minimax",
      ollama: "Ollama",
      original: "Original Claude Code",
    }[providerId] || providerId
  );
}

/**
 * Show interactive provider selection menu
 */
function showProviderMenu() {
  const defaultProvider = getDefaultProvider();
  const defaultModel = getDefaultModel();
  const configSource = getConfigurationSource();
  const configPath = getConfigurationPath();

  // Build "Default Configuration" box — only shown when a default is set
  const hasDefault =
    defaultProvider &&
    defaultProvider !== null &&
    defaultProvider !== "default";

  let subtitle = "";

  if (hasDefault) {
    const labelWidth = 10;
    const headerLine = (label, value) =>
      `${label.padEnd(labelWidth, " ")} ${value}`;

    const lines = [
      headerLine("Source:", configSource),
      headerLine("Provider:", getProviderName(defaultProvider)),
    ];

    const currentModel =
      defaultModel || getProviderDefaultModel(defaultProvider);
    if (currentModel) {
      lines.push(headerLine("Model:", currentModel));
    }

    lines.push(headerLine("Path:", configPath));

    subtitle = buildBox("\x1b[32mDefault Configuration\x1b[0m", lines);
  }

  // Main menu options - discrete, no emojis
  const menuOptions = [
    { id: "choose-provider", name: "Choose Provider" },
    { id: "set-default", name: "Set as Default" },
    { id: "api-keys", name: "Manage API Keys" },
    { id: "help", name: "Help" },
  ];

  // Add conditional options
  if (defaultProvider && defaultProvider !== null && defaultProvider !== "default") {
    menuOptions.splice(2, 0, { id: "clear-defaults", name: "Clear Default Provider" });
  }

  if (hasGlobalConfiguration()) {
    menuOptions.push({ id: "save-local", name: "Save Configuration Locally" });
  }

  return createInteractiveMenu(menuOptions, {
    title: "Claude Code Provider Switcher",
    subtitle,
    footer: "↑/↓ Navigate | Enter | ESC Exit",
    colorful: false,
    separatorAfter: 0,
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
 * Interactive default setup - shows provider selection then model selection
 */
async function setupDefaults() {
  // Build providers array (same as submenu)
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

  // Show provider selection submenu
  const selectedProvider = await createInteractiveMenu(providers, {
    title: "Setup Default Provider",
    subtitle: "Select a provider to set as default:",
    showBack: true,
    backText: "Back to Main Menu",
    colorful: true,
  });

  // ESC pressed - return special signal to go back to main menu
  if (!selectedProvider) {
    return { backToMenu: true };
  }

  setDefaultProvider(selectedProvider.id);
  console.log(`Default provider set to: ${selectedProvider.name}`);

  // Model selection (skip for original)
  if (selectedProvider.id === "original") {
    setDefaultModel("");
    console.log("Default model cleared.");
    return;
  }

  console.log(`Fetching available models for ${selectedProvider.name}...`);

  let selectedModel;
  try {
    switch (selectedProvider.id) {
      case "openrouter":
        selectedModel = await showOpenRouterModelSelection();
        break;
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
    console.log(`Error fetching models: ${error.message}`);
    selectedModel = getProviderDefaultModel(selectedProvider.id);
  }

  setDefaultModel(selectedModel);
  console.log(`Default model set to: ${selectedModel}`);
  console.log("Default configuration saved!");
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
