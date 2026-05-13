/**
 * Spawn the Claude Code CLI in a way that works on Windows.
 *
 * Node's spawn("claude") calls CreateProcess, which does not resolve npm's
 * claude.cmd shim, leading to ENOENT. Using cmd.exe /c finds claude.cmd on PATH.
 *
 * Override: set CLAUDE_SWITCH_CLAUDE_BIN to a full path to the CLI (e.g. claude.cmd).
 */

const { spawn } = require("child_process");

const ENV_CLI_BIN = "CLAUDE_SWITCH_CLAUDE_BIN";

/** @param {string} p */
function winQuoteIfNeeded(p) {
  return /[\s&]/.test(p) ? `"${p.replace(/"/g, "")}"` : p;
}

/**
 * @param {string[]} extraArgs
 * @param {import('child_process').SpawnOptions} options
 */
function spawnClaude(extraArgs = [], options = {}) {
  const override = process.env[ENV_CLI_BIN];

  if (process.platform === "win32") {
    if (override) {
      return spawn("cmd.exe", ["/c", winQuoteIfNeeded(override), ...extraArgs], options);
    }
    return spawn("cmd.exe", ["/c", "claude", ...extraArgs], options);
  }

  const command = override || "claude";
  return spawn(command, extraArgs, options);
}

module.exports = {
  spawnClaude,
  ENV_CLI_BIN,
};
