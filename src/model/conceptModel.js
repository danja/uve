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

    console.log('ConceptModel created');
  }

  /**
   * Update the conceptual model from RDF data
   */
  updateFromRDF() {
    this.log.info('Updating conceptual model from RDF data');
    console.log('Updating conceptual model from RDF data');

    // Clear current entities
    this.classes.clear();
    this.relationships.clear();
    this.interfaces.clear();

    console.log('Loading classes...');
    // Load classes
    this._loadClasses();

    console.log('Loading relationships...');
    // Load relationships between classes
    this._loadRelationships();

    console.log('Loading interfaces...');
    // Load interfaces
    this._loadInterfaces();

    console.log('Assigning positions...');
    // Assign positions to classes (simple circle layout for now)
    this._assignPositions();

    // Notify that the concept model has changed
    console.log('Publishing concept-model-changed event');
    eventBus.publish('concept-model-changed', {
      classes: Array.from(this.classes.values()),
      relationships: Array.from(this.relationships.values()),
      interfaces: Array.from(this.interfaces.values())
    });

    console.log('ConceptModel updated with:', {
      classes: this.classes.size,
      relationships: this.relationships.size,
      interfaces: this.interfaces.size
    });
  }

  /**
   * Load classes from RDF model
   * @private
   */
  _loadClasses() {
    console.log('Loading classes and class instances from RDF model');

    // First load the class definitions
    this._loadClassDefinitions();

    // Then load instances of those classes
    this._loadClassInstances();

    // Now that all classes are loaded, find subclass relationships
    console.log('Loading subclass relationships');
    this._loadSubclassRelationships();

    console.log(`Loaded ${this.classes.size} classes`);
  }

  /**
   * Load RDF class definitions
   * @private
   */
  _loadClassDefinitions() {
    try {
      const classNodes = this.rdfModel.getClasses();
      console.log('Loading class definitions, classNodes type:', typeof classNodes);

      // Debug output of classNodes
      console.log('classNodes methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(classNodes)));
      console.log('Is Grapoi object:', classNodes.constructor.name);

      // Handle Grapoi objects properly
      // We need to use forEach method of Grapoi or convert to array if it has values property
      if (classNodes && typeof classNodes.forEach === 'function') {
        console.log('Using Grapoi forEach method');

        // Use Grapoi's own forEach method
        classNodes.forEach(classNode => {
          this._processClassNode(classNode);
        });
      } else if (classNodes && Array.isArray(classNodes.values)) {
        console.log('Using values array from Grapoi object');

        // Use the values array
        classNodes.values.forEach(classNode => {
          this._processClassNode(classNode);
        });
      } else {
        console.error('classNodes is not iterable:', classNodes);
        // Attempt to handle as single node if possible
        if (classNodes && classNodes.term) {
          this._processClassNode(classNodes);
        }
      }
    } catch (error) {
      console.error('Error loading class definitions:', error);
    }
  }

  /**
   * Process a single class node from RDF
   * @param {Object} classNode - Grapoi node for a class
   * @private
   */
  _processClassNode(classNode) {
    try {
      const uri = classNode.term;
      const uriString = uri.value;

      console.log('Processing class node:', uriString);

      // Skip if we already have this class
      if (this.classes.has(uriString)) {
        return;
      }

      // Get label for the class
      let label = this._extractLabelFromUri(uriString);
      try {
        const labels = classNode.out(this.rdfModel.namespaces.rdfs.label);
        if (labels && labels.values && labels.values.length > 0) {
          label = labels.values[0];
        }
      } catch (error) {
        console.warn(`Error getting label for class ${uriString}:`, error);
      }

      // Create class entity
      const classEntity = new ClassEntity({
        uri,
        label,
        subclasses: []
      });

      // Add properties
      try {
        const properties = this.rdfModel.getProperties(uri);
        properties.forEach(property => {
          classEntity.addProperty(property);
        });
      } catch (error) {
        console.warn(`Error getting properties for class ${uriString}:`, error);
      }

      this.classes.set(uriString, classEntity);
      this.log.debug(`Loaded class: ${label} (${uriString})`);
      console.log(`Loaded class: ${label} (${uriString})`);
    } catch (error) {
      console.error('Error processing class node:', error);
    }
  }

  /**
   * Load instances of RDF classes
   * @private
   */
  _loadClassInstances() {
    try {
      // For each class we've found
      for (const classEntity of this.classes.values()) {
        console.log(`Looking for instances of class: ${classEntity.label}`);

        // Get all instances of this class
        try {
          const instanceNodes = this.rdfModel.getClassInstances(classEntity.uri);

          if (instanceNodes && typeof instanceNodes.forEach === 'function') {
            console.log('Using Grapoi forEach for instances');
            instanceNodes.forEach(instanceNode => {
              this._processInstanceNode(instanceNode, classEntity);
            });
          } else if (instanceNodes && Array.isArray(instanceNodes.values)) {
            console.log('Using values array for instances');
            instanceNodes.values.forEach(instanceNode => {
              this._processInstanceNode(instanceNode, classEntity);
            });
          } else {
            console.log('No instances found or not iterable:', instanceNodes);
          }
        } catch (error) {
          console.warn(`Error getting instances for class ${classEntity.label}:`, error);
        }
      }
    } catch (error) {
      console.error('Error loading class instances:', error);
    }
  }

  /**
   * Process a class instance node
   * @param {Object} instanceNode - Instance node
   * @param {ClassEntity} parentClassEntity - Parent class entity
   * @private
   */
  _processInstanceNode(instanceNode, parentClassEntity) {
    try {
      const uri = instanceNode.term;
      const uriString = uri.value;

      console.log('Processing instance:', uriString, 'of class', parentClassEntity.label);

      // Skip if we already have this instance
      if (this.classes.has(uriString)) {
        console.log('Instance already processed, skipping:', uriString);
        return;
      }

      // Get label for the instance
      let label = this._extractLabelFromUri(uriString);
      try {
        // Try to get foaf:name first for FOAF instances
        const names = instanceNode.out(this.rdfModel.namespaces.foaf.name);
        if (names && names.values && names.values.length > 0) {
          label = names.values[0];
        } else {
          // Fall back to rdfs:label
          const labels = instanceNode.out(this.rdfModel.namespaces.rdfs.label);
          if (labels && labels.values && labels.values.length > 0) {
            label = labels.values[0];
          }
        }
      } catch (error) {
        console.warn(`Error getting label for instance ${uriString}:`, error);
      }

      // Create class entity for this instance
      const classEntity = new ClassEntity({
        uri,
        label,
        subclasses: []
      });

      // Add properties
      try {
        const properties = this.rdfModel.getProperties(uri);
        properties.forEach(property => {
          classEntity.addProperty(property);
        });
      } catch (error) {
        console.warn(`Error getting properties for instance ${uriString}:`, error);
      }

      this.classes.set(uriString, classEntity);
      this.log.debug(`Loaded instance: ${label} (${uriString}) of class ${parentClassEntity.label}`);
      console.log(`Loaded instance: ${label} (${uriString}) of class ${parentClassEntity.label}`);
    } catch (error) {
      console.error('Error processing instance node:', error);
    }
  }

  /**
   * Load subclass relationships
   * @private
   */
  _loadSubclassRelationships() {
    for (const classEntity of this.classes.values()) {
      try {
        const subclasses = this.rdfModel.getSubclasses(classEntity.uri);

        if (subclasses && typeof subclasses.forEach === 'function') {
          // Use Grapoi's forEach
          subclasses.forEach(subclass => {
            this._processSubclass(classEntity, subclass);
          });
        } else if (subclasses && Array.isArray(subclasses.values)) {
          // Use values array
          subclasses.values.forEach(subclass => {
            this._processSubclass(classEntity, subclass);
          });
        } else {
          console.warn(`Subclasses for ${classEntity.label} is not iterable:`, subclasses);
          // Try as single node
          if (subclasses && subclasses.term) {
            this._processSubclass(classEntity, subclasses);
          }
        }
      } catch (error) {
        console.error(`Error loading subclasses for ${classEntity.label}:`, error);
      }
    }
  }

  /**
   * Process a single subclass
   * @param {ClassEntity} classEntity - Parent class
   * @param {Object} subclass - Subclass node
   * @private
   */
  _processSubclass(classEntity, subclass) {
    const subclassUri = subclass.term;
    const subclassUriString = subclassUri.value;

    // Only process if the subclass is a known class
    if (this.classes.has(subclassUriString)) {
      classEntity.addSubclass(subclassUri);
      console.log(`Added subclass ${subclassUriString} to ${classEntity.label}`);
    }
  }

  /**
   * Load relationships between classes
   * @private
   */
  _loadRelationships() {
    const relationships = this.rdfModel.getRelationships();
    console.log('Loading relationships:', relationships);

    if (!relationships || !Array.isArray(relationships)) {
      console.warn('No relationships found or invalid format:', relationships);
      return;
    }

    relationships.forEach(rel => {
      try {
        const { property, domain, range } = rel;
        const propertyUriString = property.value;

        // Skip if we already have this relationship
        if (this.relationships.has(propertyUriString)) {
          return;
        }

        // Get label for the relationship
        let label = this._extractLabelFromUri(propertyUriString);
        try {
          const propertyNode = this.rdfModel.grapoi.node(property);
          const labels = propertyNode.out(this.rdfModel.namespaces.rdfs.label);
          if (labels && labels.values && labels.values.length > 0) {
            label = labels.values[0];
          }
        } catch (error) {
          console.warn(`Error getting label for relationship ${propertyUriString}:`, error);
        }

        // Create relationship entity
        const relationshipEntity = new RelationshipEntity({
          uri: property,
          label,
          sourceClassUri: domain,
          targetClassUri: range
        });

        this.relationships.set(propertyUriString, relationshipEntity);
        this.log.debug(`Loaded relationship: ${label} (${propertyUriString})`);
        console.log(`Loaded relationship: ${label} (${propertyUriString})`);
      } catch (error) {
        console.error('Error processing relationship:', error);
      }
    });
  }

  /**
   * Load interfaces
   * @private
   */
  _loadInterfaces() {
    try {
      const interfaceType = this.rdfModel.namedNode(config.rdf.types.interface);
      const interfaces = this.rdfModel.grapoi.node(interfaceType).in(this.rdfModel.namespaces.rdf.type);
      console.log('Loading interfaces, type:', typeof interfaces);

      if (interfaces && typeof interfaces.forEach === 'function') {
        // Use Grapoi's forEach
        interfaces.forEach(interfaceNode => {
          this._processInterface(interfaceNode);
        });
      } else if (interfaces && Array.isArray(interfaces.values)) {
        // Use values array
        interfaces.values.forEach(interfaceNode => {
          this._processInterface(interfaceNode);
        });
      } else {
        console.warn('Interfaces is not iterable:', interfaces);
        // Try as single node
        if (interfaces && interfaces.term) {
          this._processInterface(interfaces);
        }
      }
    } catch (error) {
      console.error('Error loading interfaces:', error);
    }
  }

  /**
   * Process a single interface node
   * @param {Object} interfaceNode - Interface node
   * @private
   */
  _processInterface(interfaceNode) {
    try {
      const uri = interfaceNode.term;
      const uriString = uri.value;

      // Skip if we already have this interface
      if (this.interfaces.has(uriString)) {
        return;
      }

      // Get label for the interface
      let label = this._extractLabelFromUri(uriString);
      try {
        const labels = interfaceNode.out(this.rdfModel.namespaces.rdfs.label);
        if (labels && labels.values && labels.values.length > 0) {
          label = labels.values[0];
        }
      } catch (error) {
        console.warn(`Error getting label for interface ${uriString}:`, error);
      }

      // Find the class this interface belongs to
      let classUri = null;
      try {
        const classNodes = interfaceNode.in(this.rdfModel.namespaces.uve.hasInterface);
        if (classNodes && classNodes.values && classNodes.values.length > 0) {
          classUri = classNodes.term;
        }
      } catch (error) {
        console.warn(`Error finding class for interface ${uriString}:`, error);
      }

      if (!classUri) {
        this.log.warn(`Interface ${label} (${uriString}) not attached to any class`);
        console.warn(`Interface ${label} (${uriString}) not attached to any class`);
        return;
      }

      const classUriString = classUri.value;

      if (!this.classes.has(classUriString)) {
        this.log.warn(`Interface ${label} attached to unknown class ${classUriString}`);
        console.warn(`Interface ${label} attached to unknown class ${classUriString}`);
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
      try {
        const methods = interfaceNode.out(this.rdfModel.namespaces.uve.hasMethod);

        if (methods && typeof methods.forEach === 'function') {
          methods.forEach(methodNode => {
            this._processInterfaceMethod(methodNode, interfaceEntity);
          });
        } else if (methods && Array.isArray(methods.values)) {
          methods.values.forEach(methodNode => {
            this._processInterfaceMethod(methodNode, interfaceEntity);
          });
        }
      } catch (error) {
        console.warn(`Error processing methods for interface ${uriString}:`, error);
      }

      this.interfaces.set(uriString, interfaceEntity);

      // Add interface to class
      const classEntity = this.classes.get(classUriString);
      classEntity.addInterface(uri);

      this.log.debug(`Loaded interface: ${label} (${uriString}) for class ${classEntity.label}`);
      console.log(`Loaded interface: ${label} (${uriString}) for class ${classEntity.label}`);
    } catch (error) {
      console.error('Error processing interface:', error);
    }
  }

  /**
   * Process a method on an interface
   * @param {Object} methodNode - Method node
   * @param {InterfaceEntity} interfaceEntity - Interface entity
   * @private
   */
  _processInterfaceMethod(methodNode, interfaceEntity) {
    try {
      // Get method name
      let methodName = methodNode.term.value.split('#').pop().split('/').pop();
      try {
        const labels = methodNode.out(this.rdfModel.namespaces.rdfs.label);
        if (labels && labels.values && labels.values.length > 0) {
          methodName = labels.values[0];
        }
      } catch (error) {
        console.warn(`Error getting name for method:`, error);
      }

      const methodParams = [];

      // Get parameters
      try {
        const paramNodes = methodNode.out(this.rdfModel.namespaces.uve.hasParameter);

        if (paramNodes && typeof paramNodes.forEach === 'function') {
          paramNodes.forEach(paramNode => {
            this._processMethodParameter(paramNode, methodParams);
          });
        } else if (paramNodes && Array.isArray(paramNodes.values)) {
          paramNodes.values.forEach(paramNode => {
            this._processMethodParameter(paramNode, methodParams);
          });
        }
      } catch (error) {
        console.warn(`Error processing parameters for method ${methodName}:`, error);
      }

      // Get return type
      let returnType = 'void';
      try {
        const returnTypes = methodNode.out(this.rdfModel.namespaces.uve.hasReturnType);
        if (returnTypes && returnTypes.values && returnTypes.values.length > 0) {
          returnType = returnTypes.values[0];
        }
      } catch (error) {
        console.warn(`Error getting return type for method ${methodName}:`, error);
      }

      interfaceEntity.addMethod({
        name: methodName,
        parameters: methodParams,
        returnType
      });

      console.log(`Added method ${methodName} to interface ${interfaceEntity.label}`);
    } catch (error) {
      console.error('Error processing method:', error);
    }
  }

  /**
   * Process a parameter on a method
   * @param {Object} paramNode - Parameter node
   * @param {Array} methodParams - Array to add the parameter to
   * @private
   */
  _processMethodParameter(paramNode, methodParams) {
    try {
      // Get parameter name
      let paramName = paramNode.term.value.split('#').pop().split('/').pop();
      try {
        const labels = paramNode.out(this.rdfModel.namespaces.rdfs.label);
        if (labels && labels.values && labels.values.length > 0) {
          paramName = labels.values[0];
        }
      } catch (error) {
        console.warn(`Error getting name for parameter:`, error);
      }

      // Get parameter type
      let paramType = 'any';
      try {
        const types = paramNode.out(this.rdfModel.namespaces.uve.hasType);
        if (types && types.values && types.values.length > 0) {
          paramType = types.values[0];
        }
      } catch (error) {
        console.warn(`Error getting type for parameter ${paramName}:`, error);
      }

      methodParams.push({
        name: paramName,
        type: paramType
      });
    } catch (error) {
      console.error('Error processing parameter:', error);
    }
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

    console.log(`Assigning positions to ${classCount} classes`);

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

      console.log(`Positioned class ${classEntity.label} at (${classEntity.position.x.toFixed(2)}, ${classEntity.position.y.toFixed(2)}, ${classEntity.position.z.toFixed(2)})`);
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
    const uriString = typeof classUri === 'string' ? classUri : uri.value;

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
    const uriString = typeof classUri === 'string' ? classUri : uri.value;

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