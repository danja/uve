/**
 * RelationshipEntity represents a relationship between classes
 * Maps to a pipe in the visualization
 * @module model/entityTypes/relationshipEntity
 */

/**
 * Entity representing a relationship between classes
 */
class RelationshipEntity {
  /**
   * Create a new RelationshipEntity
   * @param {Object} params - Parameters
   * @param {Term} params.uri - RDF URI of the relationship property
   * @param {string} params.label - Human-readable label for the relationship
   * @param {Term} params.sourceClassUri - URI of the source class
   * @param {Term} params.targetClassUri - URI of the target class
   * @param {string} [params.type='default'] - Type of relationship
   * @param {Object} [params.metadata={}] - Additional metadata for the relationship
   */
  constructor({ uri, label, sourceClassUri, targetClassUri, type = 'default', metadata = {} }) {
    this.uri = uri;
    this.label = label;
    this.sourceClassUri = sourceClassUri;
    this.targetClassUri = targetClassUri;
    this.type = type;
    this.metadata = metadata;
    
    // Track visualization state
    this.isSelected = false;
    this.isVisible = true;
  }
  
  /**
   * Check if this relationship connects the given classes
   * @param {Term} class1Uri - First class URI
   * @param {Term} class2Uri - Second class URI
   * @returns {boolean} True if this relationship connects the classes in any direction
   */
  connectsClasses(class1Uri, class2Uri) {
    return (
      (this.sourceClassUri.equals(class1Uri) && this.targetClassUri.equals(class2Uri)) ||
      (this.sourceClassUri.equals(class2Uri) && this.targetClassUri.equals(class1Uri))
    );
  }
  
  /**
   * Get the direction of the relationship between two classes
   * @param {Term} fromClassUri - Source class URI
   * @param {Term} toClassUri - Target class URI
   * @returns {number} 1 if direction matches, -1 if reversed, 0 if not connected
   */
  getDirection(fromClassUri, toClassUri) {
    if (this.sourceClassUri.equals(fromClassUri) && this.targetClassUri.equals(toClassUri)) {
      return 1;
    } else if (this.sourceClassUri.equals(toClassUri) && this.targetClassUri.equals(fromClassUri)) {
      return -1;
    } else {
      return 0;
    }
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
      sourceClassUri: this.sourceClassUri.value,
      targetClassUri: this.targetClassUri.value,
      type: this.type,
      metadata: this.metadata
    };
  }
}

export default RelationshipEntity;
