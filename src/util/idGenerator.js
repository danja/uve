/**
 * Utility for generating unique IDs
 * @module util/idGenerator
 */

/**
 * Generate a unique ID with an optional prefix
 * @param {string} [prefix='id'] - Prefix for the ID
 * @returns {string} Unique ID
 */
function generateId(prefix = 'id') {
  return `${prefix}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Generate a unique URI for UVE namespace
 * @param {string} localName - Local part of the URI
 * @returns {string} Full URI string
 */
function generateUveUri(localName) {
  return `http://uve.example.org/ns#${localName}`;
}

/**
 * Generate a unique blank node ID
 * @returns {string} Blank node ID
 */
function generateBlankNodeId() {
  return `b${Date.now().toString(36)}${Math.random().toString(36).substring(2, 7)}`;
}

export {
  generateId,
  generateUveUri,
  generateBlankNodeId
};
