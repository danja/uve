/**
 * Storage service interface for UVE
 * Defines a common interface for different storage backends
 * @module util/storageService
 */

/**
 * Abstract base class for storage services
 * @abstract
 */
class StorageService {
    /**
     * Read data by ID
     * @async
     * @param {string} id - Resource identifier
     * @param {Object} [options] - Options for reading
     * @returns {Promise<string|Object|Uint8Array>} The retrieved data
     * @abstract
     */
    async read(id, options = {}) {
        throw new Error('Method not implemented');
    }

    /**
     * Write data with ID
     * @async
     * @param {string} id - Resource identifier
     * @param {string|Object|Uint8Array} data - Data to write
     * @param {Object} [options] - Options for writing
     * @returns {Promise<void>}
     * @abstract
     */
    async write(id, data, options = {}) {
        throw new Error('Method not implemented');
    }

    /**
     * Delete data by ID
     * @async
     * @param {string} id - Resource identifier
     * @param {Object} [options] - Options for deletion
     * @returns {Promise<void>}
     * @abstract
     */
    async delete(id, options = {}) {
        throw new Error('Method not implemented');
    }

    /**
     * List available resources
     * @async
     * @param {string} [path] - Optional path/prefix to filter resources
     * @param {Object} [options] - Listing options
     * @returns {Promise<string[]>} Array of resource identifiers
     * @abstract
     */
    async list(path = '', options = {}) {
        throw new Error('Method not implemented');
    }

    /**
     * Query data with filters
     * @async
     * @param {Object} filters - Query filters
     * @param {Object} [options] - Query options
     * @returns {Promise<Object[]>} Array of matching resources
     * @abstract
     */
    async query(filters, options = {}) {
        throw new Error('Method not implemented');
    }
}

export default StorageService;