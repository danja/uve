/**
 * Mock filesystem module for browser environments
 * Simulates Node.js fs API operations in memory
 * @module util/mockFs
 */

// In-memory storage for files
const fileStorage = new Map();

/**
 * Read a file from the mock filesystem
 * @async
 * @param {string} path - File path
 * @param {Object} [options] - Options object
 * @param {string} [options.encoding] - File encoding (e.g., 'utf8')
 * @returns {Promise<Uint8Array|string>} File contents as Uint8Array or string if encoding specified
 */
async function readFile(path, options = {}) {
    if (!fileStorage.has(path)) {
        throw new Error(`ENOENT: no such file or directory, open '${path}'`);
    }

    const content = fileStorage.get(path);

    // If encoding is specified, return as string
    if (options.encoding) {
        return content;
    }

    // Otherwise return as Uint8Array (default behavior)
    const encoder = new TextEncoder();
    return encoder.encode(content);
}

/**
 * Write data to a file in the mock filesystem
 * @async
 * @param {string} path - File path
 * @param {string|Uint8Array} data - Data to write
 * @param {Object} [options] - Options object
 * @returns {Promise<void>}
 */
async function writeFile(path, data, options = {}) {
    // If data is Uint8Array, convert to string
    if (data instanceof Uint8Array) {
        const decoder = new TextDecoder();
        data = decoder.decode(data);
    }

    fileStorage.set(path, data);
    return Promise.resolve();
}

/**
 * Delete a file from the mock filesystem
 * @async
 * @param {string} path - File path
 * @returns {Promise<void>}
 */
async function unlink(path) {
    if (!fileStorage.has(path)) {
        throw new Error(`ENOENT: no such file or directory, unlink '${path}'`);
    }

    fileStorage.delete(path);
    return Promise.resolve();
}

/**
 * Check if a file exists in the mock filesystem
 * @async
 * @param {string} path - File path
 * @returns {Promise<boolean>} True if file exists
 */
async function exists(path) {
    return Promise.resolve(fileStorage.has(path));
}

/**
 * List files in a directory in the mock filesystem
 * @async
 * @param {string} path - Directory path
 * @returns {Promise<string[]>} Array of file names
 */
async function readdir(path) {
    // Normalize path to end with a slash
    const dirPath = path.endsWith('/') ? path : path + '/';

    // Find all files that start with the directory path
    const files = [];
    for (const filePath of fileStorage.keys()) {
        if (filePath.startsWith(dirPath)) {
            // Extract the relative path inside the directory
            const relativePath = filePath.slice(dirPath.length);
            // Only include direct children (no subdirectories)
            if (!relativePath.includes('/')) {
                files.push(relativePath);
            }
        }
    }

    return Promise.resolve(files);
}

/**
 * Check if path is a directory
 * @async
 * @param {string} path - Path to check
 * @returns {Promise<boolean>} True if path is a directory
 */
async function isDirectory(path) {
    // In our mock fs, we consider a path a directory if any file path starts with it
    const dirPath = path.endsWith('/') ? path : path + '/';

    for (const filePath of fileStorage.keys()) {
        if (filePath.startsWith(dirPath)) {
            return Promise.resolve(true);
        }
    }

    return Promise.resolve(false);
}

/**
 * Create a new directory
 * @async
 * @param {string} path - Directory path
 * @returns {Promise<void>}
 */
async function mkdir(path) {
    // Directories don't need actual entries in our mock filesystem
    return Promise.resolve();
}

/**
 * Clear all files from the mock filesystem (useful for testing)
 */
function reset() {
    fileStorage.clear();
}

// Export the mock fs API
export default {
    readFile,
    writeFile,
    unlink,
    exists,
    readdir,
    isDirectory,
    mkdir,
    reset,
    // Add this property to help identify this as a mock
    isMockFs: true
};