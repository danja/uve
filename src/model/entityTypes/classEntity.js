/**
 * ClassEntity represents a class in the UVE model
 * Maps to a sphere in the visualization
 * @module model/entityTypes/classEntity
 */

/**
 * Entity representing a class
 */
class ClassEntity {
  /**
   * Create a new ClassEntity
   * @param {Object} params - Parameters
   * @param {Term} params.uri - RDF URI of the class
   * @param {string} params.label - Human-readable label for the class
   * @param {Array<string>} [params.interfaces=[]] - Interface URIs attached to this class
   * @param {Array<string>} [params.subclasses=[]] - Subclass URIs contained in this class
   * @param {Object} [params.position] - 3D position of the class sphere
   * @param {number} [params.position.x=0] - X coordinate
   * @param {number} [params.position.y=0] - Y coordinate
   * @param {number} [params.position.z=0] - Z coordinate
   * @param {number} [params.radius] - Radius of the class sphere, calculated from subclasses if not provided
   */
  constructor({ uri, label, interfaces = [], subclasses = [], position = { x: 0, y: 0, z: 0 }, radius }) {
    this.uri = uri;
    this.label = label;
    this.interfaces = interfaces;
    this.subclasses = subclasses;
    this.position = position;
    this._radius = radius;
    
    // Additional metadata
    this.properties = [];
    this.isSelected = false;
  }
  
  /**
   * Get the calculated or explicit radius
   * @returns {number} Radius value
   */
  get radius() {
    if (this._radius) {
      return this._radius;
    }
    
    // Calculate radius based on subclass count if not explicitly set
    const baseRadius = 5;
    const subclassMultiplier = 0.5;
    return baseRadius + (this.subclasses.length * subclassMultiplier);
  }
  
  /**
   * Set the radius explicitly
   * @param {number} value - New radius value
   */
  set radius(value) {
    this._radius = value;
  }
  
  /**
   * Add an interface to this class
   * @param {string} interfaceUri - URI of the interface to add
   */
  addInterface(interfaceUri) {
    if (!this.interfaces.includes(interfaceUri)) {
      this.interfaces.push(interfaceUri);
    }
  }
  
  /**
   * Add a subclass to this class
   * @param {string} subclassUri - URI of the subclass to add
   */
  addSubclass(subclassUri) {
    if (!this.subclasses.includes(subclassUri)) {
      this.subclasses.push(subclassUri);
    }
  }
  
  /**
   * Add a property to this class
   * @param {Object} property - Property object
   * @param {Term} property.predicate - Predicate term
   * @param {Term} property.object - Object term
   */
  addProperty(property) {
    this.properties.push(property);
  }
  
  /**
   * Serialize to JSON
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      uri: this.uri.value,
      label: this.label,
      interfaces: this.interfaces.map(i => i.value),
      subclasses: this.subclasses.map(s => s.value),
      position: this.position,
      radius: this.radius,
      properties: this.properties.map(p => ({
        predicate: p.predicate.value,
        object: p.object.value
      }))
    };
  }
}

export default ClassEntity;
