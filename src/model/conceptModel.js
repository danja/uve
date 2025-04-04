/**
 * Conceptual model that transforms RDF data into domain entities
 * @module model/conceptModel
 */

import log from 'loglevel';
import eventBus from '../core/eventBus.js';
import config from '../core/config.js';
import ClassEntity from './entityTypes/classEntity.js';
import RelationshipEntity from './entityTypes/relationshipEntity.js';
import InterfaceEntity from './entityTypes/interfaceEntity.js';

class ConceptModel {
  /**
   * Create a new ConceptModel
   * @param {RDFModel} rdfModel - RDF data model
   */
  constructor(rdfModel) {
    this.rdfModel = rdfModel;
    this.classes = new Map(); // URI string -> ClassEntity
    this.relationships = new Map(); // URI string -> RelationshipEntity
    this.interfaces = new Map(); // URI string -> InterfaceEntity
    this.log = log.getLogger('ConceptModel');
    
    // Subscribe to RDF model changes
    eventBus.subscribe('rdf-model-changed', () => this.updateFromRDF());
  }

  /**
   * Update the conceptual model from RDF data
   */
  updateFromRDF() {
    this.log.info('Updating conceptual model from RDF data');
    
    // Clear current entities
    this.classes.clear();
    this.relationships.clear();
    this.interfaces.clear();
    
    // Load classes
    this._loadClasses();
    
    // Load relationships between classes
    this._loadRelationships();
    
    // Load interfaces
    this._loadInterfaces();
    
    // Assign positions to classes (simple circle layout for now)
    this._assignPositions();
    
    // Notify that the concept model has changed
    eventBus.publish('concept-model-changed', {
      classes: Array.from(this.classes.values()),
      relationships: Array.from(this.relationships.values()),
      interfaces: Array.from(this.interfaces.values())
    });
  }

  /**
   * Load classes from RDF model
   * @private
   */
  _loadClasses() {
    const classNodes = this.rdfModel.getClasses();
    
    classNodes.forEach(classNode => {
      const uri = classNode.term;
      const uriString = uri.value;
      
      // Skip if we already have this class
      if (this.classes.has(uriString)) {
        return;
      }
      
      // Get label for the class
      const labels = classNode.out(this.rdfModel.namespaces.rdfs.label);
      const label = labels.values[0] || this._extractLabelFromUri(uriString);
      
      // Create class entity
      const classEntity = new ClassEntity({ 
        uri, 
        label,
        subclasses: []
      });
      
      // Add properties
      const properties = this.rdfModel.getProperties(uri);
      properties.forEach(property => {
        classEntity.addProperty(property);
      });
      
      this.classes.set(uriString, classEntity);
      this.log.debug(`Loaded class: ${label} (${uriString})`);
    });
    
    // Now that all classes are loaded, find subclass relationships
    this._loadSubclassRelationships();
  }
  
  /**
   * Load subclass relationships
   * @private
   */
  _loadSubclassRelationships() {
    for (const classEntity of this.classes.values()) {
      const subclasses = this.rdfModel.getSubclasses(classEntity.uri);
      
      subclasses.forEach(subclass => {
        const subclassUri = subclass.term;
        const subclassUriString = subclassUri.value;
        
        // Only process if the subclass is a known class
        if (this.classes.has(subclassUriString)) {
          classEntity.addSubclass(subclassUri);
        }
      });
    }
  }

  /**
   * Load relationships between classes
   * @private
   */
  _loadRelationships() {
    const relationships = this.rdfModel.getRelationships();
    
    relationships.forEach(rel => {
      const { property, domain, range } = rel;
      const propertyUriString = property.value;
      
      // Skip if we already have this relationship
      if (this.relationships.has(propertyUriString)) {
        return;
      }
      
      // Get label for the relationship
      const propertyNode = this.rdfModel.grapoi.node(property);
      const labels = propertyNode.out(this.rdfModel.namespaces.rdfs.label);
      const label = labels.values[0] || this._extractLabelFromUri(propertyUriString);
      
      // Create relationship entity
      const relationshipEntity = new RelationshipEntity({
        uri: property,
        label,
        sourceClassUri: domain,
        targetClassUri: range
      });
      
      this.relationships.set(propertyUriString, relationshipEntity);
      this.log.debug(`Loaded relationship: ${label} (${propertyUriString})`);
    });
  }

  /**
   * Load interfaces
   * @private
   */
  _loadInterfaces() {
    const interfaceType = this.rdfModel.namedNode(config.rdf.types.interface);
    const interfaces = this.rdfModel.grapoi.node(interfaceType).in(this.rdfModel.namespaces.rdf.type);
    
    interfaces.forEach(interfaceNode => {
      const uri = interfaceNode.term;
      const uriString = uri.value;
      
      // Skip if we already have this interface
      if (this.interfaces.has(uriString)) {
        return;
      }
      
      // Get label for the interface
      const labels = interfaceNode.out(this.rdfModel.namespaces.rdfs.label);
      const label = labels.values[0] || this._extractLabelFromUri(uriString);
      
      // Find the class this interface belongs to
      const classNodes = interfaceNode.in(this.rdfModel.namespaces.uve.hasInterface);
      
      if (classNodes.values.length === 0) {
        this.log.warn(`Interface ${label} (${uriString}) not attached to any class`);
        return;
      }
      
      const classUri = classNodes.term;
      const classUriString = classUri.value;
      
      if (!this.classes.has(classUriString)) {
        this.log.warn(`Interface ${label} attached to unknown class ${classUriString}`);
        return;
      }
      
      // Create random spherical position
      const position = {
        phi: Math.random() * Math.PI * 2, // 0 to 2π
        theta: Math.random() * Math.PI // 0 to π
      };
      
      // Create interface entity
      const interfaceEntity = new InterfaceEntity({
        uri,
        label,
        classUri,
        position
      });
      
      // Add methods to the interface (if any)
      const methods = interfaceNode.out(this.rdfModel.namespaces.uve.hasMethod);
      
      methods.forEach(methodNode => {
        const methodName = methodNode.out(this.rdfModel.namespaces.rdfs.label).values[0] ||
                          methodNode.term.value.split('#').pop().split('/').pop();
        
        const methodParams = [];
        const paramNodes = methodNode.out(this.rdfModel.namespaces.uve.hasParameter);
        
        paramNodes.forEach(paramNode => {
          const paramName = paramNode.out(this.rdfModel.namespaces.rdfs.label).values[0] ||
                           paramNode.term.value.split('#').pop().split('/').pop();
          
          const paramType = paramNode.out(this.rdfModel.namespaces.uve.hasType).values[0] || 'any';
          
          methodParams.push({
            name: paramName,
            type: paramType
          });
        });
        
        const returnType = methodNode.out(this.rdfModel.namespaces.uve.hasReturnType).values[0] || 'void';
        
        interfaceEntity.addMethod({
          name: methodName,
          parameters: methodParams,
          returnType
        });
      });
      
      this.interfaces.set(uriString, interfaceEntity);
      
      // Add interface to class
      const classEntity = this.classes.get(classUriString);
      classEntity.addInterface(uri);
      
      this.log.debug(`Loaded interface: ${label} (${uriString}) for class ${classEntity.label}`);
    });
  }

  /**
   * Assign positions to classes
   * @private
   */
  _assignPositions() {
    const classes = Array.from(this.classes.values());
    const classCount = classes.length;
    
    if (classCount === 0) {
      return;
    }
    
    // For a single class, place it at origin
    if (classCount === 1) {
      classes[0].position = { x: 0, y: 0, z: 0 };
      return;
    }
    
    // For multiple classes, arrange in a circle on the XZ plane
    const radius = Math.max(30, classCount * 5);
    const angleStep = (Math.PI * 2) / classCount;
    
    classes.forEach((classEntity, index) => {
      const angle = index * angleStep;
      
      classEntity.position = {
        x: radius * Math.sin(angle),
        y: 0,
        z: radius * Math.cos(angle)
      };
    });
  }

  /**
   * Extract a human-readable label from a URI
   * @param {string} uri - URI to extract label from
   * @returns {string} Extracted label
   * @private
   */
  _extractLabelFromUri(uri) {
    // Try to extract the fragment
    let label = uri.split('#').pop();
    
    // If no fragment, try the last path segment
    if (label === uri) {
      label = uri.split('/').pop();
    }
    
    return label;
  }

  /**
   * Get a class entity by URI
   * @param {Term|string} uri - Class URI
   * @returns {ClassEntity|null} Class entity or null if not found
   */
  getClass(uri) {
    const uriString = typeof uri === 'string' ? uri : uri.value;
    return this.classes.get(uriString) || null;
  }

  /**
   * Get relationships for a class
   * @param {Term|string} classUri - Class URI
   * @returns {Array<RelationshipEntity>} Relationships involving the class
   */
  getClassRelationships(classUri) {
    const uriString = typeof classUri === 'string' ? classUri : classUri.value;
    
    return Array.from(this.relationships.values()).filter(rel => {
      return rel.sourceClassUri.value === uriString || rel.targetClassUri.value === uriString;
    });
  }

  /**
   * Get interfaces for a class
   * @param {Term|string} classUri - Class URI
   * @returns {Array<InterfaceEntity>} Interfaces for the class
   */
  getClassInterfaces(classUri) {
    const uriString = typeof classUri === 'string' ? classUri : classUri.value;
    
    return Array.from(this.interfaces.values()).filter(intf => {
      return intf.classUri.value === uriString;
    });
  }

  /**
   * Get a relationship entity by URI
   * @param {Term|string} uri - Relationship URI
   * @returns {RelationshipEntity|null} Relationship entity or null if not found
   */
  getRelationship(uri) {
    const uriString = typeof uri === 'string' ? uri : uri.value;
    return this.relationships.get(uriString) || null;
  }

  /**
   * Get an interface entity by URI
   * @param {Term|string} uri - Interface URI
   * @returns {InterfaceEntity|null} Interface entity or null if not found
   */
  getInterface(uri) {
    const uriString = typeof uri === 'string' ? uri : uri.value;
    return this.interfaces.get(uriString) || null;
  }
}

export default ConceptModel;
