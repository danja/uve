/**
 * RDF data model for UVE
 * Manages RDF datasets using RDF-Ext and Grapoi
 * @module model/rdfModel
 */

import rdf from 'rdf-ext';
import log from 'loglevel';
import eventBus from '../core/eventBus.js';
import config from '../core/config.js';
import storageManager from '../util/storageManager.js';

class RDFModel {
  /**
   * Create a new RDF Model
   */
  constructor() {
    this.dataset = rdf.dataset();
    this.grapoi = rdf.grapoi({ dataset: this.dataset });
    this.namespaces = {};
    this.log = log.getLogger('RDFModel');

    // Initialize namespaces
    Object.entries(config.rdf.defaultNamespaces).forEach(([prefix, uri]) => {
      this.namespaces[prefix] = rdf.namespace(uri);
    });
  }

  /**
   * Load RDF data from storage
   * @param {string} id - Resource identifier
   * @returns {Promise<rdf.Dataset>} The loaded dataset
   */
  async loadFromStorage(id) {
    try {
      this.log.info(`Loading RDF data from storage: ${id}`);

      // Read from storage
      const content = await storageManager.readFile(id, { encoding: 'utf8' });

      // Determine format from file extension
      const format = this.getFormatFromId(id);

      // Clear existing dataset
      this.dataset = rdf.dataset();

      // Parse content into dataset
      const parser = new this._getParser(format);
      const quads = parser.parse(content);
      for (const quad of quads) {
        this.dataset.add(quad);
      }

      // Reinitialize grapoi with new dataset
      this.grapoi = rdf.grapoi({ dataset: this.dataset });

      this.log.info(`Loaded ${this.dataset.size} triples from ${id}`);
      eventBus.publish('rdf-model-changed', { source: 'storage', id });

      return this.dataset;
    } catch (error) {
      this.log.error(`Error loading RDF data from ${id}:`, error);
      throw error;
    }
  }

  /**
   * Save RDF data to storage
   * @param {string} id - Resource identifier
   * @returns {Promise<void>}
   */
  async saveToStorage(id) {
    try {
      this.log.info(`Saving RDF data to storage: ${id}`);

      // Determine format from file extension
      const format = this.getFormatFromId(id);

      // Serialize dataset to string
      const serializer = new this._getSerializer(format);
      const content = serializer.serialize(this.dataset);

      // Write to storage
      await storageManager.writeFile(id, content);

      this.log.info(`Saved ${this.dataset.size} triples to ${id}`);
    } catch (error) {
      this.log.error(`Error saving RDF data to ${id}:`, error);
      throw error;
    }
  }

  /**
   * Load RDF data from a Turtle file (for backward compatibility)
   * @param {string} filePath - Path to the Turtle file
   * @returns {Promise<rdf.Dataset>} The loaded dataset
   * @deprecated Use loadFromStorage instead
   */
  async loadFromFile(filePath) {
    return this.loadFromStorage(filePath);
  }

  /**
   * Save RDF data to a Turtle file (for backward compatibility)
   * @param {string} filePath - Path to save the Turtle file
   * @returns {Promise<void>}
   * @deprecated Use saveToStorage instead
   */
  async saveToFile(filePath) {
    return this.saveToStorage(filePath);
  }

  /**
   * Add a triple to the dataset
   * @param {Term} subject - Subject term
   * @param {Term} predicate - Predicate term
   * @param {Term} object - Object term
   */
  addTriple(subject, predicate, object) {
    const quad = rdf.quad(subject, predicate, object);
    this.dataset.add(quad);
    this.log.debug(`Added triple: ${quad.toString()}`);
    eventBus.publish('rdf-model-changed', { source: 'addTriple', quad });
  }

  /**
   * Remove a triple from the dataset
   * @param {Term} subject - Subject term
   * @param {Term} predicate - Predicate term
   * @param {Term} object - Object term
   */
  removeTriple(subject, predicate, object) {
    const matches = this.dataset.match(subject, predicate, object);
    this.dataset.deleteMatches(subject, predicate, object);
    this.log.debug(`Removed ${matches.size} triples`);
    eventBus.publish('rdf-model-changed', { source: 'removeTriple', matches });
  }

  /**
   * Get all RDF classes from the dataset
   * @returns {Grapoi} Grapoi object containing class nodes
   */
  getClasses() {
    return this.grapoi.node(this.namespaces.rdfs.Class)
      .in(this.namespaces.rdf.type);
  }

  /**
   * Get all properties for a given subject
   * @param {Term} subject - Subject term
   * @returns {Array<Object>} Array of property objects with predicate and object
   */
  getProperties(subject) {
    const properties = [];
    const matches = this.dataset.match(subject);

    for (const quad of matches) {
      properties.push({
        predicate: quad.predicate,
        object: quad.object
      });
    }

    return properties;
  }

  /**
   * Get subclasses of a given class
   * @param {Term} classUri - URI of the class
   * @returns {Grapoi} Grapoi object containing subclass nodes
   */
  getSubclasses(classUri) {
    return this.grapoi.node(classUri)
      .in(this.namespaces.rdfs.subClassOf);
  }

  /**
   * Get interfaces for a class
   * @param {Term} classUri - URI of the class
   * @returns {Grapoi} Grapoi object containing interface nodes
   */
  getInterfaces(classUri) {
    return this.grapoi.node(classUri)
      .out(this.namespaces.uve.hasInterface);
  }

  /**
   * Get relationships between classes
   * @returns {Array<Object>} Array of relationship objects
   */
  getRelationships() {
    const relationships = [];
    const properties = this.grapoi.node(this.namespaces.rdf.Property)
      .in(this.namespaces.rdf.type);

    for (const property of properties) {
      const domains = property.out(this.namespaces.rdfs.domain);
      const ranges = property.out(this.namespaces.rdfs.range);

      // For each domain-range pair, create a relationship
      for (const domain of domains) {
        for (const range of ranges) {
          relationships.push({
            property: property.term,
            domain: domain.term,
            range: range.term
          });
        }
      }
    }

    return relationships;
  }

  /**
   * Create a named node with the given URI
   * @param {string} uri - URI for the named node
   * @returns {NamedNode} RDF named node
   */
  namedNode(uri) {
    return rdf.namedNode(uri);
  }

  /**
   * Create a literal with the given value
   * @param {string} value - Value for the literal
   * @param {string} [datatype] - Optional datatype URI
   * @returns {Literal} RDF literal
   */
  literal(value, datatype) {
    return datatype ?
      rdf.literal(value, null, rdf.namedNode(datatype)) :
      rdf.literal(value);
  }

  /**
   * Get RDF format from resource identifier
   * @param {string} id - Resource identifier
   * @returns {string} MIME type for the format
   * @private
   */
  getFormatFromId(id) {
    const extension = id.split('.').pop().toLowerCase();

    const formatMap = {
      ttl: 'text/turtle',
      nt: 'application/n-triples',
      nq: 'application/n-quads',
      trig: 'application/trig',
      jsonld: 'application/ld+json',
      json: 'application/ld+json'
    };

    return formatMap[extension] || 'text/turtle';
  }

  /**
   * Get parser for a given format
   * @param {string} format - MIME type
   * @returns {Object} Parser for the format
   * @private
   */
  _getParser(format) {
    return rdf.formats.parsers.get(format);
  }

  /**
   * Get serializer for a given format
   * @param {string} format - MIME type
   * @returns {Object} Serializer for the format
   * @private
   */
  _getSerializer(format) {
    return rdf.formats.serializers.get(format);
  }
}

export default RDFModel;