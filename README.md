# Claude Code Provider Switcher

A powerful CLI tool that lets you seamlessly switch between different AI providers for Claude Code, including OpenRouter, Anthropic, Ollama, and the original Claude Code configuration.

## 🚀 Features

- **Multi-Provider Support**: Switch between OpenRouter, Anthropic, Ollama, and original Claude Code
- **Interactive Menu**: User-friendly interface for provider and model selection
- **Default Configuration**: Set and save your preferred provider and model
- **Model Selection**: Choose from hundreds of models across different providers
- **Auto-Restart**: Automatically restarts with new configuration after changes
- **Cross-Platform**: Works on Windows, macOS, and Linux
- **Global Installation**: Install once and use anywhere

## 📦 Installation

### Prerequisites

First, ensure you have [Claude Code](https://docs.anthropic.com/en/docs/claude-code/quickstart) installed.

```bash
npm install -g @anthropic-ai/claude-code
```

### Global Installation (Method 1)

```bash
# Install globally
npm install -g claude-code-provider-switch
```

### Global Installation (Method 2 - Alternative)

```bash
# Clone the repository
git clone <repository-url>
cd claude-code-provider-switch

# Install globally
npm install -g .

# Or use npm link for development (changes are immediate)
npm run link
```

## 🎯 Quick Start

### Basic Usage

```bash
# Show interactive menu
claude-switch

# Use a specific provider
claude-switch openrouter
claude-switch anthropic
claude-switch ollama
claude-switch original

# Use specific provider with model selection
claude-switch openrouter --model
```

### Configuration Management

```bash
# Set up default provider and model interactively
claude-switch set-default

# View current defaults
claude-switch show-defaults

# Clear all defaults
claude-switch clear-defaults

# Manage API keys interactively
claude-switch api-keys
```

## ⚙️ Configuration

### Environment Variables

The CLI is designed to create a `~/.claude/.claude-switch-env` (in your home directory) with this syntax:

```env
# API Keys for different providers
OPENROUTER_AUTH_TOKEN=your_openrouter_token_here
ANTHROPIC_API_KEY=your_anthropic_key_here
OLLAMA_AUTH_TOKEN=your_ollama_token_here

# Optional: Default models for each provider
OPENROUTER_MODEL=openrouter/free
ANTHROPIC_MODEL=claude-3-5-sonnet-latest
OLLAMA_MODEL=minimax-m2.5:cloud

# Default provider and model settings
DEFAULT_PROVIDER=default  # Use 'default' to show menu on startup, or set to 'openrouter', 'anthropic', 'ollama', or 'original'
DEFAULT_MODEL=
```

When you run the CLI for the first time, based on your selection, it will ask for the API keys or Auth Tokens and after this will be saved in the `.env` file for future use.

### Global vs Local Configuration

The CLI supports two configuration modes:

#### Global Configuration (Default)

- **Location**: `~/.claude/.claude-switch-env` (in your home directory)
- **Priority**: Used when no local `.env` file exists
- **Benefit**: Share configuration across all projects
- **Creation**: Automatically created on first run when no local `.env` exists

#### Local Configuration

- **Location**: `.env` file in your project directory
- **Priority**: Overrides global configuration when present
- **Benefit**: Project-specific settings
- **Creation**: Create manually or use "Save Configuration Locally" menu option

#### Configuration Display

The main menu shows which configuration source is active:

```
Configuration: Global (~/.claude/.claude-switch-en)
Configuration: Local (current_folder/.env)
```

#### Menu Behavior

- **No defaults set**: Shows interactive menu for provider selection
- **Defaults set**: Auto-launches with configured provider
- **Fresh install**: Always shows menu until you set defaults

#### Switching Between Modes

- **To Local**: Use "Save Configuration Locally" option from main menu
- **To Global**: Delete local `.env` file to fall back to global config
- **Priority**: Local always takes precedence over global when both exist

### API Key Management

For easier API key management, use the interactive menu:

```bash
# Launch interactive API key management
claude-switch api-keys
```

Or access it through the main menu (option 6) when you run `claude-switch` without arguments.

**Features:**

- 🔐 **Secure**: API keys are masked for display (shows only first 4 and last 4 characters)
- 🎯 **Visual**: Clear status indicators (✅/❌) show which providers have keys configured
- ⚡ **Interactive**: Arrow key navigation with visual selection indicators
- 🔄 **Flexible**: Update, remove, or set new API keys interactively

### Provider Setup

#### OpenRouter

1. Get your API key from [OpenRouter](https://openrouter.ai/keys)
2. Set `OPENROUTER_AUTH_TOKEN` in your `.env` file or through the interactive menu
3. Run `claude-switch openrouter --model` to browse available models

#### Anthropic

1. Get your API key from [Anthropic Console](https://console.anthropic.com/)
2. Set `ANTHROPIC_API_KEY` in your `.env` file or through the interactive menu
3. Run `claude-switch anthropic --model` to browse available models

#### Ollama

1. Install and run [Ollama](https://ollama.ai/)
2. Optional: Set `OLLAMA_AUTH_TOKEN` in your `.env` file or through the interactive menu if using a remote Ollama instance
3. Run `claude-switch ollama --model` to see locally available models

## 📋 Commands Reference

### Provider Commands

| Command      | Description              | Example                    |
| ------------ | ------------------------ | -------------------------- |
| `openrouter` | Use OpenRouter provider  | `claude-switch openrouter` |
| `anthropic`  | Use Anthropic provider   | `claude-switch anthropic`  |
| `ollama`     | Use Ollama provider      | `claude-switch ollama`     |
| `original`   | Use original Claude Code | `claude-switch original`   |

### Model Selection

| Command              | Description               | Example                            |
| -------------------- | ------------------------- | ---------------------------------- |
| `<provider> --model` | Select model for provider | `claude-switch openrouter --model` |

### Configuration Commands

| Command          | Description                   | Example                        |
| ---------------- | ----------------------------- | ------------------------------ |
| `set-default`    | Interactive default setup     | `claude-switch set-default`    |
| `show-defaults`  | View current defaults         | `claude-switch show-defaults`  |
| `clear-defaults` | Reset all defaults            | `claude-switch clear-defaults` |
| `api-keys`       | Manage API keys interactively | `claude-switch api-keys`       |
| `help`           | Show help information         | `claude-switch --help`         |
| `version`        | Show Version information      | `claude-switch --version`      |

### Aliases

| Command      | Aliases                        |
| ------------ | ------------------------------ |
| `openrouter` | `or`, `open`                   |
| `anthropic`  | `ant`                          |
| `ollama`     | `oll`                          |
| `original`   | `original`, `orig`, `def`, `d` |


### ⚠️ Important:Clearing Defaults

**If the interactive menu doesn't show and Claude Code opens directly with a predefined provider**, you need to clear the default settings:

```bash
claude-switch clear-defaults
```

### Why This Happens

When you use the "Set as Default" option, the application saves your provider and model choices to provide a faster experience. However, if you want to change providers or access the full menu again, you must clear these defaults first.

### What Clearing Defaults Does

- Resets the default provider to "default" in `.env` file (which takes you to the interactive menu)
- Clears any saved default model
- Does not affect your saved API keys in `.env`

**Always run `claude-switch clear-defaults` when:**

- Menu options don't appear on startup
- You want to try a different provider
- You want to change your default model
- The application bypasses the menu

## � Quick Start

### Basic Usage

When you run `claude-switch` without arguments, you'll see an interactive menu:

```
Claude Code Provider Switcher

Current default: OpenRouter (openrouter/free)

Available providers:

❯ 1) OpenRouter    Aliases: (openrouter, or, open)
  2) Ollama         Aliases: (ollama, oll)
  3) Anthropic      Aliases: (anthropic, ant)
  4) Original Claude Code  Aliases: (original, orig, def, d)
  5) Set as Default  Aliases: (set-default)
  6) Manage API Keys  Aliases: (api-keys, keys)
  7) Help           Aliases: (help, -h, --help)

Controls:
↑/↓ - Navigate
Enter - Select provider
1-7 - Quick select
ESC - Exit
```

## 🔧 Advanced Usage

### Programmatic API

You can also use this package as a module in your Node.js applications:

```javascript
const {
  setDefaultProvider,
  getDefaultProvider,
  launchOpenRouter,
  launchAnthropic,
  showApiKeyMenu,
  updateApiKey,
  maskApiKey,
} = require("claude-code-provider-switch");

// Set default provider programmatically
await setDefaultProvider("openrouter");

// Get current provider
const current = getDefaultProvider();
console.log(`Current provider: ${current}`);

// Launch specific provider
await launchOpenRouter(false, [], "gpt-4");

// Manage API keys programmatically
await showApiKeyMenu(); // Show interactive API key menu
await updateApiKey({
  id: "openrouter",
  name: "OpenRouter",
  envVar: "OPENROUTER_AUTH_TOKEN",
}); // Update specific API key
console.log(maskApiKey("sk-1234567890abcdef")); // "sk-1234...cdef"
```

### Development

```bash
# Install for development with symlink (changes are immediate)
npm run link

# Run directly from source
npm run dev -- --help

# Run tests
npm run test:all

# Unlink development version
npm run unlink

# Install production version
npm install -g .
```

## 🐛 Troubleshooting

### Common Issues

**"API key required" error**

- Check your `.env` file contains the correct API key
- Ensure the `.env` file is in your current working directory

**Menu selection not showing options, opens Claude Code directly**

- Try clearing defaults: `claude-switch clear-defaults`

**File permission errors**

- Ensure you have write permissions to create/modify the `.env` file
- Try running with elevated permissions if necessary

### Debug Mode

For debugging, you can run the tool directly from source:

```bash
node bin/claude-switch.js --help
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

### Development Scripts

- `npm run dev` - Run directly from source
- `npm run test:validation` - Run validation tests
- `npm run test:provider` - Run provider integration tests
- `npm run test:comprehensive` - Run comprehensive tests
- `npm run test:all` - Run all test suites

## 📄 License

MIT License - see LICENSE file for details

## 🔗 Related Projects

- [Claude Code](https://github.com/anthropics/claude-code) - Official Claude Code repository
- [OpenRouter](https://openrouter.ai/) - Unified API for AI models
- [Ollama](https://ollama.ai/) - Local AI model deployment

## 📞 Support

If you encounter any issues or have questions:

1. Check the troubleshooting section above
2. Search existing GitHub issues
3. Create a new issue with detailed information
4. Include your OS, Node.js version, and error messages

---

**Made with ❤️ by Adrian R**
