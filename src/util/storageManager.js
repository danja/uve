/**
 * Storage manager for UVE
 * Provides a unified interface for storage operations
 * @module util/storageManager
 */

import FSStorageService from './fsStorageService.js';
import SPARQLStorageService from './sparqlStorageService.js';
import mockFs from './mockFs.js';
import log from 'loglevel';
import config from '../core/config.js';

/**
 * Storage manager singleton
 */
class StorageManager {
    /**
     * Create a new StorageManager
     */
    constructor() {
        this.log = log.getLogger('StorageManager');
        this.storageServices = new Map();
        this.defaultService = null;

        // Initialize with filesystem storage by default
        this.setupDefaultStorage();
    }

    /**
     * Set up default storage service based on config
     */
    setupDefaultStorage() {
        const storageConfig = config.storage || {};
        const storageType = storageConfig.type || 'fs';

        if (storageType === 'sparql') {
            const endpoint = storageConfig.endpoint || 'http://localhost:3030/uve/sparql';
            const graphUri = storageConfig.graphUri || '';

            this.log.info(`Setting up SPARQL storage with endpoint: ${endpoint}`);

            const sparqlService = new SPARQLStorageService(endpoint, graphUri, {
                prefix: storageConfig.prefix || 'http://uve.example.org/resource/',
                headers: storageConfig.headers || {}
            });

            this.registerService('default', sparqlService);
            this.setDefaultService('default');
        } else {
            this.log.info('Setting up filesystem storage');

            const fsService = new FSStorageService(mockFs, storageConfig.basePath || '');
            this.registerService('default', fsService);
            this.setDefaultService('default');
        }

        // Set up the window.fs object for backward compatibility
        if (typeof window !== 'undefined') {
            window.fs = {
                readFile: this.readFile.bind(this),
                writeFile: this.writeFile.bind(this),
                unlink: this.delete.bind(this),
                exists: this.exists.bind(this),
                readdir: this.list.bind(this)
            };
        }
    }

    /**
     * Register a storage service
     * @param {string} name - Service name
     * @param {StorageService} service - Storage service instance
     */
    registerService(name, service) {
        this.storageServices.set(name, service);
        this.log.debug(`Registered storage service: ${name}`);

        // Set as default if no default is set
        if (!this.defaultService) {
            this.setDefaultService(name);
        }
    }

    /**
     * Set the default storage service
     * @param {string} name - Service name
     */
    setDefaultService(name) {
        if (!this.storageServices.has(name)) {
            throw new Error(`Storage service not found: ${name}`);
        }

        this.defaultService = name;
        this.log.info(`Set default storage service: ${name}`);
    }

    /**
     * Get a storage service by name
     * @param {string} [name] - Service name (uses default if not specified)
     * @returns {StorageService} Storage service
     */
    getService(name) {
        const serviceName = name || this.defaultService;

        if (!this.storageServices.has(serviceName)) {
            throw new Error(`Storage service not found: ${serviceName}`);
        }

        return this.storageServices.get(serviceName);
    }

    /**
     * Read a file (compatible with fs API)
     * @async
     * @param {string} path - File path
     * @param {Object} [options] - Options object
     * @returns {Promise<Uint8Array|string>} File contents
     */
    async readFile(path, options = {}) {
        try {
            const service = this.getService();
            return await service.read(path, options);
        } catch (error) {
            this.log.error(`Error reading file ${path}:`, error);
            throw error;
        }
    }

    /**
     * Write a file (compatible with fs API)
     * @async
     * @param {string} path - File path
     * @param {string|Uint8Array} data - Data to write
     * @param {Object} [options] - Options object
     * @returns {Promise<void>}
     */
    async writeFile(path, data, options = {}) {
        try {
            const service = this.getService();
            return await service.write(path, data, options);
        } catch (error) {
            this.log.error(`Error writing file ${path}:`, error);
            throw error;
        }
    }

    /**
     * Delete a file (compatible with fs API)
     * @async
     * @param {string} path - File path
     * @returns {Promise<void>}
     */
    async delete(path) {
        try {
            const service = this.getService();
            return await service.delete(path);
        } catch (error) {
            this.log.error(`Error deleting file ${path}:`, error);
            throw error;
        }
    }

    /**
     * Check if a file exists (compatible with fs API)
     * @async
     * @param {string} path - File path
     * @returns {Promise<boolean>} True if file exists
     */
    async exists(path) {
        try {
            const service = this.getService();
            const data = await service.read(path);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * List files in a directory (compatible with fs API)
     * @async
     * @param {string} path - Directory path
     * @returns {Promise<string[]>} Array of file names
     */
    async list(path = '') {
        try {
            const service = this.getService();
            return await service.list(path);
        } catch (error) {
            this.log.error(`Error listing files in ${path}:`, error);
            throw error;
        }
    }

    /**
     * Query data with filters
     * @async
     * @param {Object} filters - Query filters
     * @param {Object} [options] - Query options
     * @returns {Promise<Object[]>} Array of matching resources
     */
    async query(filters, options = {}) {
        try {
            const service = this.getService();
            return await service.query(filters, options);
        } catch (error) {
            this.log.error(`Error querying with filters:`, error);
            throw error;
        }
    }
}

// Export a singleton instance
const storageManager = new StorageManager();
export default storageManager;