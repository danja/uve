/**
 * FileSystem-based storage service implementation
 * @module util/fsStorageService
 */

import StorageService from './storageService.js';
import mockFs from './mockFs.js';

/**
 * Storage service implementation using filesystem (mock or real)
 */
class FSStorageService extends StorageService {
    /**
     * Create a new FSStorageService
     * @param {Object} [fs=mockFs] - Filesystem module to use (defaults to mockFs)
     * @param {string} [basePath=''] - Base path for all storage operations
     */
    constructor(fs = mockFs, basePath = '') {
        super();
        this.fs = fs;
        this.basePath = basePath.endsWith('/') ? basePath : basePath + '/';
    }

    /**
     * Get full path for a resource ID
     * @param {string} id - Resource identifier
     * @returns {string} Full path
     * @private
     */
    _getPath(id) {
        return this.basePath + id;
    }

    /**
     * Read data by ID
     * @async
     * @param {string} id - Resource identifier
     * @param {Object} [options={}] - Options for reading
     * @param {string} [options.encoding] - Encoding to use (e.g., 'utf8')
     * @returns {Promise<string|Uint8Array>} The retrieved data
     */
    async read(id, options = {}) {
        const path = this._getPath(id);
        return await this.fs.readFile(path, options);
    }

    /**
     * Write data with ID
     * @async
     * @param {string} id - Resource identifier
     * @param {string|Object|Uint8Array} data - Data to write
     * @param {Object} [options={}] - Options for writing
     * @returns {Promise<void>}
     */
    async write(id, data, options = {}) {
        const path = this._getPath(id);

        // Ensure parent directories exist
        if (id.includes('/')) {
            const dirPath = id.substring(0, id.lastIndexOf('/'));
            await this.fs.mkdir(this.basePath + dirPath, { recursive: true });
        }

        // Convert object to JSON string if it's an object
        if (typeof data === 'object' && !(data instanceof Uint8Array)) {
            data = JSON.stringify(data);
        }

        return await this.fs.writeFile(path, data, options);
    }

    /**
     * Delete data by ID
     * @async
     * @param {string} id - Resource identifier
     * @param {Object} [options={}] - Options for deletion
     * @returns {Promise<void>}
     */
    async delete(id, options = {}) {
        const path = this._getPath(id);
        return await this.fs.unlink(path);
    }

    /**
     * List available resources
     * @async
     * @param {string} [path=''] - Optional path/prefix to filter resources
     * @param {Object} [options={}] - Listing options
     * @returns {Promise<string[]>} Array of resource identifiers
     */
    async list(path = '', options = {}) {
        const dirPath = this._getPath(path);

        // Check if directory exists
        if (!(await this.fs.isDirectory(dirPath))) {
            return [];
        }

        const files = await this.fs.readdir(dirPath);

        // Map full paths back to resource IDs
        return files.map(file => {
            const fullPath = path ? `${path}/${file}` : file;
            return fullPath;
        });
    }

    /**
     * Query data with filters
     * @async
     * @param {Object} filters - Query filters
     * @param {Object} [options={}] - Query options
     * @returns {Promise<Object[]>} Array of matching resources
     */
    async query(filters, options = {}) {
        // Simple implementation: list all files in the given path and filter in-memory
        const path = filters.path || '';
        const resources = await this.list(path, options);

        const results = [];
        for (const id of resources) {
            try {
                // Try to read as JSON by default
                const data = await this.read(id, { encoding: 'utf8' });

                try {
                    const parsedData = JSON.parse(data);

                    // Check if the data matches all filters
                    let matches = true;
                    for (const [key, value] of Object.entries(filters)) {
                        if (key !== 'path' && (!parsedData[key] || parsedData[key] !== value)) {
                            matches = false;
                            break;
                        }
                    }

                    if (matches) {
                        results.push({
                            id,
                            data: parsedData
                        });
                    }
                } catch (e) {
                    // Not valid JSON, skip this file
                    continue;
                }
            } catch (e) {
                // Error reading file, skip it
                continue;
            }
        }

        return results;
    }
}

export default FSStorageService;