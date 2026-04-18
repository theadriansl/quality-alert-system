/**
 * Case Transformation Utilities
 *
 * Provides functions to transform between snake_case (PostgreSQL) and camelCase (JavaScript)
 * Handles nested objects and arrays recursively
 */

/**
 * Convert a snake_case string to camelCase
 * @param {string} str - The snake_case string
 * @returns {string} The camelCase string
 */
function snakeToCamel(str) {
  if (typeof str !== 'string') return str;

  return str.replace(/_([a-z0-9])/g, (match, letter) => letter.toUpperCase());
}

/**
 * Convert a camelCase string to snake_case
 * @param {string} str - The camelCase string
 * @returns {string} The snake_case string
 */
function camelToSnake(str) {
  if (typeof str !== 'string') return str;

  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/**
 * Transform object keys from snake_case to camelCase
 * Handles nested objects and arrays recursively
 * @param {*} obj - The object to transform (can be object, array, or primitive)
 * @returns {*} The transformed object
 */
function snakeToCamelKeys(obj) {
  // Handle null and undefined
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => snakeToCamelKeys(item));
  }

  // Handle dates
  if (obj instanceof Date) {
    return obj;
  }

  // Handle primitives
  if (typeof obj !== 'object') {
    return obj;
  }

  // Handle objects
  const transformed = {};

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const camelKey = snakeToCamel(key);
      const value = obj[key];

      // Recursively transform the value
      transformed[camelKey] = snakeToCamelKeys(value);
    }
  }

  return transformed;
}

/**
 * Transform object keys from camelCase to snake_case
 * Handles nested objects and arrays recursively
 * @param {*} obj - The object to transform (can be object, array, or primitive)
 * @returns {*} The transformed object
 */
function camelToSnakeKeys(obj) {
  // Handle null and undefined
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => camelToSnakeKeys(item));
  }

  // Handle dates
  if (obj instanceof Date) {
    return obj;
  }

  // Handle primitives
  if (typeof obj !== 'object') {
    return obj;
  }

  // Handle objects
  const transformed = {};

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const snakeKey = camelToSnake(key);
      const value = obj[key];

      // Recursively transform the value
      transformed[snakeKey] = camelToSnakeKeys(value);
    }
  }

  return transformed;
}

/**
 * Transform a database row (or array of rows) from snake_case to camelCase
 * This is the primary function to use when returning data from PostgreSQL
 * @param {Object|Array} data - The database row(s) to transform
 * @returns {Object|Array} The transformed data
 */
function transformToCamelCase(data) {
  if (!data) return data;

  if (Array.isArray(data)) {
    return data.map(row => snakeToCamelKeys(row));
  }

  return snakeToCamelKeys(data);
}

/**
 * Transform request body from camelCase to snake_case for database insertion
 * This is the primary function to use when receiving data from frontend
 * @param {Object|Array} data - The request data to transform
 * @returns {Object|Array} The transformed data
 */
function transformToSnakeCase(data) {
  if (!data) return data;

  if (Array.isArray(data)) {
    return data.map(item => camelToSnakeKeys(item));
  }

  return camelToSnakeKeys(data);
}

/**
 * Middleware to automatically transform response data to camelCase
 * Usage: app.use(responseTransformMiddleware)
 */
function responseTransformMiddleware(req, res, next) {
  // Store original json method
  const originalJson = res.json.bind(res);

  // Override json method
  res.json = function(data) {
    // Transform data to camelCase before sending
    const transformedData = transformToCamelCase(data);
    return originalJson(transformedData);
  };

  next();
}

/**
 * Express middleware to transform request body from camelCase to snake_case
 * Usage: app.use(express.json(), requestTransformMiddleware)
 */
function requestTransformMiddleware(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = transformToSnakeCase(req.body);
  }

  next();
}

module.exports = {
  // String transformers
  snakeToCamel,
  camelToSnake,

  // Object transformers
  snakeToCamelKeys,
  camelToSnakeKeys,

  // Primary functions
  transformToCamelCase,
  transformToSnakeCase,

  // Middleware
  responseTransformMiddleware,
  requestTransformMiddleware
};
