/**
 * Input validation utilities
 */

const { ValidationError } = require("./errors");

/**
 * Validate model name
 * @param {string} model - Model name to validate
 * @returns {string} Validated model name
 * @throws {ValidationError} If model is invalid
 */
function validateModelName(model) {
  if (typeof model !== "string") {
    throw new ValidationError("Model name must be a string", "model");
  }

  const trimmed = model.trim();
  if (trimmed.length === 0) {
    throw new ValidationError("Model name cannot be empty", "model");
  }

  if (trimmed.length > 100) {
    throw new ValidationError(
      "Model name too long (max 100 characters)",
      "model",
    );
  }

  return trimmed;
}

/**
 * Validate authentication token
 * @param {string|null} token - Token to validate
 * @returns {string|null} Validated token or null
 * @throws {ValidationError} If token is invalid
 */
function validateAuthToken(token) {
  if (token === null || token === undefined) {
    return null;
  }

  if (typeof token !== "string") {
    throw new ValidationError("Auth token must be a string", "token");
  }

  const trimmed = token.trim();
  if (trimmed.length === 0) {
    return null; // Empty token is treated as not provided
  }

  if (trimmed.length < 10) {
    throw new ValidationError(
      "Auth token too short (min 10 characters)",
      "token",
    );
  }

  if (trimmed.length > 1000) {
    throw new ValidationError(
      "Auth token too long (max 1000 characters)",
      "token",
    );
  }

  return trimmed;
}

/**
 * Validate API response for models
 * @param {object} response - API response object
 * @returns {Array} Validated models array
 * @throws {ValidationError} If response is invalid
 */
function validateModelResponse(response) {
  if (!response || typeof response !== "object") {
    throw new ValidationError("Invalid response: expected object", "response");
  }

  const models = response.models || response.data || response;

  if (!Array.isArray(models)) {
    throw new ValidationError(
      "Invalid response: expected array of models",
      "models",
    );
  }

  if (models.length === 0) {
    throw new ValidationError("No models found in response", "models");
  }

  // Validate each model has at least a name or id field
  models.forEach((model, index) => {
    if (!model || typeof model !== "object") {
      throw new ValidationError(
        `Invalid model at index ${index}: expected object`,
        `models[${index}]`,
      );
    }

    const modelName = model.name || model.id;
    if (!modelName || typeof modelName !== "string") {
      throw new ValidationError(
        `Model at index ${index} missing name or id field`,
        `models[${index}]`,
      );
    }
  });

  return models;
}

/**
 * Validate hostname
 * @param {string} hostname - Hostname to validate
 * @returns {string} Validated hostname
 * @throws {ValidationError} If hostname is invalid
 */
function validateHostname(hostname) {
  if (typeof hostname !== "string") {
    throw new ValidationError("Hostname must be a string", "hostname");
  }

  const trimmed = hostname.trim();
  if (trimmed.length === 0) {
    throw new ValidationError("Hostname cannot be empty", "hostname");
  }

  if (trimmed.length > 253) {
    throw new ValidationError(
      "Hostname too long (max 253 characters)",
      "hostname",
    );
  }

  // Basic hostname validation
  const hostnameRegex = /^[a-zA-Z0-9.-]+$/;
  if (!hostnameRegex.test(trimmed)) {
    throw new ValidationError(
      "Hostname contains invalid characters",
      "hostname",
    );
  }

  return trimmed;
}

/**
 * Validate port number
 * @param {number} port - Port number to validate
 * @returns {number} Validated port
 * @throws {ValidationError} If port is invalid
 */
function validatePort(port) {
  if (typeof port !== "number") {
    throw new ValidationError("Port must be a number", "port");
  }

  if (!Number.isInteger(port)) {
    throw new ValidationError("Port must be an integer", "port");
  }

  if (port < 1 || port > 65535) {
    throw new ValidationError("Port must be between 1 and 65535", "port");
  }

  return port;
}

module.exports = {
  validateModelName,
  validateAuthToken,
  validateModelResponse,
  validateHostname,
  validatePort,
};
