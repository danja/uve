/**
 * SPARQL-based storage service implementation
 * @module util/sparqlStorageService
 */

import StorageService from './storageService.js';

/**
 * Storage service implementation using SPARQL endpoint
 */
class SPARQLStorageService extends StorageService {
    /**
     * Create a new SPARQLStorageService
     * @param {string} endpoint - SPARQL endpoint URL
     * @param {string} [graphUri=''] - Default graph URI to use
     * @param {Object} [options={}] - Additional options
     * @param {Object} [options.headers={}] - HTTP headers to include in requests
     * @param {number} [options.timeout=30000] - Request timeout in milliseconds
     * @param {string} [options.prefix='uve:'] - Prefix for UVE resources
     */
    constructor(endpoint, graphUri = '', options = {}) {
        super();
        this.endpoint = endpoint;
        this.graphUri = graphUri;
        this.headers = options.headers || {};
        this.timeout = options.timeout || 30000;
        this.prefix = options.prefix || 'uve:';

        // Set default headers
        this.headers = {
            'Accept': 'application/sparql-results+json,application/json',
            'Content-Type': 'application/x-www-form-urlencoded',
            ...this.headers
        };
    }

    /**
     * Convert resource ID to URI
     * @param {string} id - Resource identifier
     * @returns {string} Full URI for the resource
     * @private
     */
    _getResourceUri(id) {
        // If already a URI (starts with http), return as is
        if (id.startsWith('http://') || id.startsWith('https://')) {
            return `<${id}>`;
        }

        // Otherwise, prefix with the UVE namespace
        return `${this.prefix}${id}`;
    }

    /**
     * Execute a SPARQL query
     * @async
     * @param {string} query - SPARQL query to execute
     * @param {boolean} [isUpdate=false] - Whether this is an update query
     * @returns {Promise<Object>} Query results
     * @private
     */
    async _executeSparql(query, isUpdate = false) {
        const params = new URLSearchParams();

        if (isUpdate) {
            params.append('update', query);
        } else {
            params.append('query', query);
        }

        try {
            const response = await fetch(this.endpoint, {
                method: 'POST',
                headers: this.headers,
                body: params.toString(),
                timeout: this.timeout
            });

            if (!response.ok) {
                throw new Error(`SPARQL request failed: ${response.status} ${response.statusText}`);
            }

            // For update operations, we don't need to parse the response
            if (isUpdate) {
                return { success: true };
            }

            return await response.json();
        } catch (error) {
            console.error('SPARQL query error:', error);
            throw error;
        }
    }

    /**
     * Read data by ID
     * @async
     * @param {string} id - Resource identifier
     * @param {Object} [options={}] - Options for reading
     * @param {string} [options.format='object'] - Format to return: 'object', 'turtle', 'n-triples'
     * @returns {Promise<Object|string>} The retrieved data
     */
    async read(id, options = {}) {
        const resourceUri = this._getResourceUri(id);
        const format = options.format || 'object';

        let query;
        if (this.graphUri) {
            query = `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        CONSTRUCT { ?s ?p ?o }
        FROM <${this.graphUri}>
        WHERE {
          ?s ?p ?o .
          FILTER(?s = ${resourceUri})
        }
      `;
        } else {
            query = `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        CONSTRUCT { ?s ?p ?o }
        WHERE {
          ?s ?p ?o .
          FILTER(?s = ${resourceUri})
        }
      `;
        }

        // Override headers for this request to get the right format
        const originalAccept = this.headers['Accept'];

        try {
            if (format === 'turtle') {
                this.headers['Accept'] = 'text/turtle';
            } else if (format === 'n-triples') {
                this.headers['Accept'] = 'application/n-triples';
            } else {
                this.headers['Accept'] = 'application/ld+json';
            }

            const result = await this._executeSparql(query);

            if (format === 'object' && typeof result === 'string') {
                // Parse JSON-LD to a simpler object structure
                return this._simplifyJsonLd(JSON.parse(result));
            }

            return result;
        } finally {
            // Restore original Accept header
            this.headers['Accept'] = originalAccept;
        }
    }

    /**
     * Write data with ID
     * @async
     * @param {string} id - Resource identifier
     * @param {Object|string} data - Data to write (object or serialized RDF)
     * @param {Object} [options={}] - Options for writing
     * @param {string} [options.format='object'] - Format of input data: 'object', 'turtle', 'n-triples'
     * @returns {Promise<void>}
     */
    async write(id, data, options = {}) {
        const resourceUri = this._getResourceUri(id);
        const format = options.format || 'object';

        // First, delete any existing triples for this resource
        await this.delete(id);

        let insertQuery;

        if (format === 'object') {
            // Convert object to SPARQL INSERT statements
            const triples = this._objectToTriples(id, data);

            if (this.graphUri) {
                insertQuery = `
          INSERT DATA {
            GRAPH <${this.graphUri}> {
              ${triples}
            }
          }
        `;
            } else {
                insertQuery = `
          INSERT DATA {
            ${triples}
          }
        `;
            }
        } else if (format === 'turtle' || format === 'n-triples') {
            // Data is already in RDF format, use LOAD or equivalent
            // This is a simplified approach; in practice, you might need
            // to use a different method like uploading directly to a triple store

            if (this.graphUri) {
                insertQuery = `
          INSERT DATA {
            GRAPH <${this.graphUri}> {
              ${data}
            }
          }
        `;
            } else {
                insertQuery = `
          INSERT DATA {
            ${data}
          }
        `;
            }
        } else {
            throw new Error(`Unsupported format: ${format}`);
        }

        await this._executeSparql(insertQuery, true);
    }

    /**
     * Delete data by ID
     * @async
     * @param {string} id - Resource identifier
     * @param {Object} [options={}] - Options for deletion
     * @returns {Promise<void>}
     */
    async delete(id, options = {}) {
        const resourceUri = this._getResourceUri(id);

        let deleteQuery;
        if (this.graphUri) {
            deleteQuery = `
        DELETE WHERE {
          GRAPH <${this.graphUri}> {
            ${resourceUri} ?p ?o .
          }
        }
      `;
        } else {
            deleteQuery = `
        DELETE WHERE {
          ${resourceUri} ?p ?o .
        }
      `;
        }

        await this._executeSparql(deleteQuery, true);
    }

    /**
     * List available resources
     * @async
     * @param {string} [type=''] - Optional RDF type to filter resources
     * @param {Object} [options={}] - Listing options
     * @returns {Promise<string[]>} Array of resource identifiers
     */
    async list(type = '', options = {}) {
        let typeFilter = '';
        if (type) {
            const typeUri = this._getResourceUri(type);
            typeFilter = `
        ?s rdf:type ${typeUri} .
      `;
        }

        let query;
        if (this.graphUri) {
            query = `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        SELECT DISTINCT ?s
        FROM <${this.graphUri}>
        WHERE {
          ?s ?p ?o .
          ${typeFilter}
        }
      `;
        } else {
            query = `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        SELECT DISTINCT ?s
        WHERE {
          ?s ?p ?o .
          ${typeFilter}
        }
      `;
        }

        const result = await this._executeSparql(query);

        // Extract resource URIs from results
        const resources = [];
        if (result.results && result.results.bindings) {
            for (const binding of result.results.bindings) {
                if (binding.s && binding.s.value) {
                    resources.push(this._uriToId(binding.s.value));
                }
            }
        }

        return resources;
    }

    /**
     * Query data with filters
     * @async
     * @param {Object} filters - Query filters
     * @param {Object} [options={}] - Query options
     * @returns {Promise<Object[]>} Array of matching resources
     */
    async query(filters, options = {}) {
        // Convert filters to SPARQL patterns
        const patterns = [];
        const filterValues = [];

        for (const [key, value] of Object.entries(filters)) {
            const varName = `?${key}`;
            const propUri = this._getResourceUri(key);

            patterns.push(`?s ${propUri} ${varName} .`);

            if (value !== undefined) {
                // Add a FILTER for this value
                if (typeof value === 'string') {
                    filterValues.push(`FILTER(${varName} = "${value}")`);
                } else if (typeof value === 'number') {
                    filterValues.push(`FILTER(${varName} = ${value})`);
                } else if (typeof value === 'boolean') {
                    filterValues.push(`FILTER(${varName} = ${value})`);
                }
            }
        }

        let query;
        if (this.graphUri) {
            query = `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        SELECT ?s
        FROM <${this.graphUri}>
        WHERE {
          ${patterns.join('\n  ')}
          ${filterValues.join('\n  ')}
        }
      `;
        } else {
            query = `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        SELECT ?s
        WHERE {
          ${patterns.join('\n  ')}
          ${filterValues.join('\n  ')}
        }
      `;
        }

        const result = await this._executeSparql(query);

        // Fetch full data for each matching resource
        const resources = [];
        if (result.results && result.results.bindings) {
            for (const binding of result.results.bindings) {
                if (binding.s && binding.s.value) {
                    const id = this._uriToId(binding.s.value);
                    const data = await this.read(id);
                    resources.push({
                        id,
                        data
                    });
                }
            }
        }

        return resources;
    }

    /**
     * Convert URI to resource ID
     * @param {string} uri - Resource URI
     * @returns {string} Resource ID
     * @private
     */
    _uriToId(uri) {
        // If using the UVE prefix, remove it
        if (this.prefix && uri.startsWith(this.prefix)) {
            return uri.substring(this.prefix.length);
        }

        // Otherwise return the full URI
        return uri;
    }

    /**
     * Convert object to SPARQL triples
     * @param {string} id - Resource ID
     * @param {Object} obj - Object to convert
     * @returns {string} SPARQL triples
     * @private
     */
    _objectToTriples(id, obj) {
        const resourceUri = this._getResourceUri(id);
        const triples = [];

        for (const [key, value] of Object.entries(obj)) {
            const predicate = this._getResourceUri(key);

            if (Array.isArray(value)) {
                // Handle arrays
                for (const item of value) {
                    triples.push(this._createTriple(resourceUri, predicate, item));
                }
            } else {
                // Handle single values
                triples.push(this._createTriple(resourceUri, predicate, value));
            }
        }

        return triples.join('\n');
    }

    /**
     * Create a single SPARQL triple
     * @param {string} subject - Subject URI
     * @param {string} predicate - Predicate URI
     * @param {string|number|boolean|Object} object - Object value
     * @returns {string} SPARQL triple
     * @private
     */
    _createTriple(subject, predicate, object) {
        if (typeof object === 'string') {
            // Check if it looks like a URI
            if (object.startsWith('http://') || object.startsWith('https://')) {
                return `${subject} ${predicate} <${object}> .`;
            } else {
                return `${subject} ${predicate} "${object}" .`;
            }
        } else if (typeof object === 'number') {
            return `${subject} ${predicate} ${object} .`;
        } else if (typeof object === 'boolean') {
            return `${subject} ${predicate} "${object}"^^<http://www.w3.org/2001/XMLSchema#boolean> .`;
        } else if (object === null) {
            // Skip null values
            return '';
        } else if (typeof object === 'object') {
            // Nested objects not supported in this simple implementation
            console.warn('Nested objects not supported in SPARQL conversion:', object);
            return '';
        }

        return '';
    }

    /**
     * Simplify JSON-LD to a more usable object structure
     * @param {Object} jsonld - JSON-LD data
     * @returns {Object} Simplified object
     * @private
     */
    _simplifyJsonLd(jsonld) {
        // Very basic JSON-LD simplification
        // In a real implementation, you would use a proper JSON-LD processor

        // If it's an array with a single object, extract it
        if (Array.isArray(jsonld) && jsonld.length === 1) {
            jsonld = jsonld[0];
        }

        const result = {};

        // Process all properties
        for (const [key, value] of Object.entries(jsonld)) {
            // Skip @context, @id, etc.
            if (key.startsWith('@')) {
                continue;
            }

            if (Array.isArray(value)) {
                result[key] = value.map(item => {
                    if (item['@value']) {
                        return item['@value'];
                    } else if (item['@id']) {
                        return item['@id'];
                    } else {
                        return this._simplifyJsonLd(item);
                    }
                });
            } else if (typeof value === 'object') {
                if (value['@value']) {
                    result[key] = value['@value'];
                } else if (value['@id']) {
                    result[key] = value['@id'];
                } else {
                    result[key] = this._simplifyJsonLd(value);
                }
            } else {
                result[key] = value;
            }
        }

        return result;
    }
}

export default SPARQLStorageService;