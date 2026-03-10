/**
 * Menu system for Claude Code Provider Switcher
 */

const { log } = require("./config");

/**
 * Show interactive provider selection menu
 */
function showProviderMenu() {
  const readline = require("readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const providers = [
    {
      id: "openrouter",
      name: "OpenRouter",
      aliases: ["openrouter", "or", "open"],
    },
    { id: "ollama", name: "Ollama", aliases: ["ollama", "oll"] },
    { id: "anthropic", name: "Anthropic", aliases: ["anthropic", "ant"] },
    {
      id: "default",
      name: "Default Claude Code",
      aliases: ["default", "def", "d"],
    },
    { id: "help", name: "Help", aliases: ["help", "-h", "--help"] },
  ];

  let selectedIndex = 0;

  function displayMenu() {
    console.clear();
    log("Claude Code Provider Switcher", "green");
    log("", "reset");
    log("Available providers:", "yellow");
    log("", "reset");

    providers.forEach((provider, index) => {
      const marker = index === selectedIndex ? "❯" : " ";
      const aliases =
        provider.aliases.length > 0
          ? `    Aliases: (${provider.aliases.join(", ")})`
          : "";
      log(
        `${marker} ${index + 1}) ${provider.name}${aliases}`,
        index === selectedIndex ? "green" : "reset",
      );
    });

    log("", "reset");
    log("Controls:", "yellow");
    log("↑/↓ - Navigate", "reset");
    log("Enter - Select provider", "reset");
    log("1-5 - Quick select", "reset");
    log("q/ESC - Exit", "reset");
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
      } else if (key.name === "escape" || (str && str.toLowerCase() === "q")) {
        rl.close();
        log("Exiting...", "yellow");
        process.exit(0);
      } else if (key.name === "return") {
        rl.close();
        resolve(providers[selectedIndex]);
      } else if (str && /^[1-5]$/.test(str)) {
        const index = parseInt(str) - 1;
        if (index >= 0 && index < providers.length) {
          selectedIndex = index;
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
  log("Options:", "reset");
  log("  --model            - Show interactive model selection menu", "reset");
  log(
    "  --model <name>     - Use best matching model (e.g., --model gpt4)",
    "reset",
  );
  log("  --help             - Show this help message", "reset");
  log("", "reset");
  log("Examples:", "reset");
  log("  claude-switch openrouter --model", "reset");
  log("  claude-switch ollama --model llama", "reset");
  log("  claude-switch openrouter --model gpt-4", "reset");
  log("", "reset");
  log("Run without arguments to show interactive provider menu.", "reset");
  log("", "reset");
}

module.exports = {
  showProviderMenu,
  showUsage,
};
