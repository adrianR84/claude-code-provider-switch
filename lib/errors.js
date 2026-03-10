/**
 * Custom error classes for provider operations
 */

/**
 * Base provider error
 */
class ProviderError extends Error {
  constructor(message, provider, cause) {
    super(message);
    this.name = 'ProviderError';
    this.provider = provider;
    this.cause = cause;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Network-related errors
 */
class NetworkError extends ProviderError {
  constructor(message, provider, statusCode = null) {
    super(message, provider);
    this.name = 'NetworkError';
    this.statusCode = statusCode;
  }
}

/**
 * Authentication errors
 */
class AuthenticationError extends ProviderError {
  constructor(message, provider) {
    super(message, provider);
    this.name = 'AuthenticationError';
  }
}

/**
 * Validation errors
 */
class ValidationError extends Error {
  constructor(message, field = null) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Cache errors
 */
class CacheError extends Error {
  constructor(message, operation = null) {
    super(message);
    this.name = 'CacheError';
    this.operation = operation;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = {
  ProviderError,
  NetworkError,
  AuthenticationError,
  ValidationError,
  CacheError
};
