/**
 * InterfaceEntity represents an interface on a class
 * Maps to a port on a sphere in the visualization
 * @module model/entityTypes/interfaceEntity
 */

/**
 * Entity representing an interface
 */
class InterfaceEntity {
  /**
   * Create a new InterfaceEntity
   * @param {Object} params - Parameters
   * @param {Term} params.uri - RDF URI of the interface
   * @param {string} params.label - Human-readable label for the interface
   * @param {Term} params.classUri - URI of the class this interface belongs to
   * @param {Object} [params.position] - Spherical position on the class sphere
   * @param {number} [params.position.phi=0] - Horizontal angle (0-2π)
   * @param {number} [params.position.theta=0] - Vertical angle (0-π)
   * @param {Object} [params.metadata={}] - Additional metadata for the interface
   */
  constructor({ uri, label, classUri, position = { phi: 0, theta: 0 }, metadata = {} }) {
    this.uri = uri;
    this.label = label;
    this.classUri = classUri;
    this.position = position;
    this.metadata = metadata;
    
    // Methods provided by this interface
    this.methods = [];
    
    // Track visualization state
    this.isSelected = false;
    this.isVisible = true;
  }
  
  /**
   * Add a method to this interface
   * @param {Object} method - Method information
   * @param {string} method.name - Method name
   * @param {Array<Object>} [method.parameters=[]] - Method parameters
   * @param {string} [method.returnType] - Return type of the method
   */
  addMethod(method) {
    this.methods.push(method);
  }
  
  /**
   * Calculate a 3D position on the sphere based on spherical coordinates
   * @param {number} radius - Radius of the class sphere
   * @returns {Object} 3D coordinates {x, y, z}
   */
  getPositionOnSphere(radius) {
    const { phi, theta } = this.position;
    
    return {
      x: radius * Math.sin(theta) * Math.cos(phi),
      y: radius * Math.sin(theta) * Math.sin(phi),
      z: radius * Math.cos(theta)
    };
  }
  
  /**
   * Update the position of this interface on the sphere
   * @param {number} phi - Horizontal angle (0-2π)
   * @param {number} theta - Vertical angle (0-π)
   */
  updatePosition(phi, theta) {
    this.position.phi = phi;
    this.position.theta = theta;
  }
  
  /**
   * Toggle selection state
   * @returns {boolean} New selection state
   */
  toggleSelection() {
    this.isSelected = !this.isSelected;
    return this.isSelected;
  }
  
  /**
   * Serialize to JSON
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      uri: this.uri.value,
      label: this.label,
      classUri: this.classUri.value,
      position: this.position,
      methods: this.methods,
      metadata: this.metadata
    };
  }
}

export default InterfaceEntity;
