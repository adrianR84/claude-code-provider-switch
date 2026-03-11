/**
 * Claude Code Provider Switcher - Main Entry Point
 *
 * This is the main entry point for importing the package as a module.
 * For CLI usage, use the bin/claude-switch.js file.
 */

module.exports = {
  // Configuration utilities
  ...require("./lib/config"),

  // Provider launchers
  launchOpenRouter: require("./lib/openrouter").launchOpenRouter,
  launchAnthropic: require("./lib/anthropic").launchAnthropic,
  launchOllama: require("./lib/ollama").launchOllama,
  launchDefault: require("./lib/default").launchDefault,

  // Menu functions
  showProviderMenu: require("./lib/menu").showProviderMenu,
  showUsage: require("./lib/menu").showUsage,
  showDefaults: require("./lib/menu").showDefaults,
  setupDefaults: require("./lib/menu").setupDefaults,
  showModelSelectionForProvider:
    require("./lib/menu").showModelSelectionForProvider,

  // API key management
  showApiKeyMenu: require("./lib/config").showApiKeyMenu,
  updateApiKey: require("./lib/config").updateApiKey,
  maskApiKey: require("./lib/config").maskApiKey,
};
