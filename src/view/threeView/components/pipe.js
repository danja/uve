/**
 * Pipe component for representing relationships between classes
 * @module view/threeView/components/pipe
 */

import * as THREE from 'three';
import config from '../../../core/config.js';

class Pipe {
  /**
   * Create a new Pipe component
   * @param {Object} params - Parameters
   * @param {RelationshipEntity} params.relationshipEntity - Relationship entity to represent
   * @param {Sphere} params.sourceSphere - Source sphere
   * @param {Sphere} params.targetSphere - Target sphere
   * @param {THREE.Group} params.parent - Parent group to add pipe to
   */
  constructor({ relationshipEntity, sourceSphere, targetSphere, parent }) {
    this.relationshipEntity = relationshipEntity;
    this.sourceSphere = sourceSphere;
    this.targetSphere = targetSphere;
    this.parent = parent;
    
    // Get pipe radius from config
    this.radius = config.visualization.pipe.defaultRadius;
    
    // Create the pipe mesh
    this.createPipe();
    
    // Create label
    this.createLabel();
    
    // Add to parent
    this.parent.add(this.mesh);
  }
  
  /**
   * Create the pipe mesh
   */
  createPipe() {
    // Get positions of source and target spheres
    const sourcePos = this.sourceSphere.getWorldPosition();
    const targetPos = this.targetSphere.getWorldPosition();
    
    // Account for sphere radii - adjust start and end points
    const direction = new THREE.Vector3().subVectors(targetPos, sourcePos).normalize();
    const sourceRadius = this.sourceSphere.getRadius();
    const targetRadius = this.targetSphere.getRadius();
    
    // Adjust start and end points to be on the sphere surfaces
    const start = new THREE.Vector3().copy(sourcePos).addScaledVector(direction, sourceRadius + 0.1);
    const end = new THREE.Vector3().copy(targetPos).addScaledVector(direction, -targetRadius - 0.1);
    
    // Calculate length of the pipe
    const length = start.distanceTo(end);
    
    // Create geometry
    this.geometry = new THREE.CylinderGeometry(
      this.radius,
      this.radius,
      length,
      config.visualization.pipe.segments,
      1,
      false
    );
    
    // Rotate and position geometry
    this.geometry.translate(0, length / 2, 0);
    this.geometry.rotateX(Math.PI / 2);
    
    // Create material
    this.material = new THREE.MeshPhongMaterial({
      color: config.visualization.pipe.defaultColor,
      shininess: 30
    });
    
    // Create mesh
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    
    // Position and orient the pipe
    this.mesh.position.copy(start);
    this.mesh.lookAt(end);
    
    // Add metadata to mesh
    this.mesh.userData = {
      type: 'relationship',
      uri: this.relationshipEntity.uri.value,
      label: this.relationshipEntity.label,
      entity: this.relationshipEntity
    };
    
    // Create an arrow at the target end
    this.createArrow(end, direction);
  }
  
  /**
   * Create an arrow at the target end
   * @param {THREE.Vector3} position - Position for the arrow
   * @param {THREE.Vector3} direction - Direction the arrow points
   */
  createArrow(position, direction) {
    // Create cone geometry for arrow
    const arrowGeometry = new THREE.ConeGeometry(
      this.radius * 2,
      this.radius * 4,
      config.visualization.pipe.segments
    );
    
    // Rotate to point along pipe
    arrowGeometry.rotateX(-Math.PI / 2);
    
    // Create material
    const arrowMaterial = new THREE.MeshPhongMaterial({
      color: config.visualization.pipe.defaultColor,
      shininess: 30
    });
    
    // Create mesh
    this.arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
    
    // Position arrow at the end of the pipe
    this.arrow.position.copy(position);
    this.arrow.lookAt(position.clone().sub(direction));
    
    // Add arrow to parent
    this.parent.add(this.arrow);
  }
  
  /**
   * Create a text label for the pipe
   */
  createLabel() {
    // Create a canvas for the texture
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 64;
    
    // Draw background
    context.fillStyle = 'rgba(50, 50, 50, 0.7)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw border
    context.strokeStyle = 'white';
    context.lineWidth = 2;
    context.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
    
    // Draw text
    context.font = '18px Arial';
    context.fillStyle = 'white';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(this.relationshipEntity.label, canvas.width / 2, canvas.height / 2);
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    
    // Create sprite material
    const material = new THREE.SpriteMaterial({ map: texture });
    
    // Create sprite
    this.label = new THREE.Sprite(material);
    this.label.scale.set(5, 1.25, 1);
    
    // Position at middle of pipe
    const sourcePos = this.sourceSphere.getWorldPosition();
    const targetPos = this.targetSphere.getWorldPosition();
    const midpoint = new THREE.Vector3().addVectors(sourcePos, targetPos).multiplyScalar(0.5);
    
    // Elevate slightly
    midpoint.y += 1;
    
    this.label.position.copy(midpoint);
    
    // Add label to parent
    this.parent.add(this.label);
  }
  
  /**
   * Update the pipe based on sphere positions
   */
  update() {
    // Re-create pipe to update position and orientation
    this.dispose(false);
    this.createPipe();
    this.createLabel();
    
    // Update appearance based on selection state
    if (this.relationshipEntity.isSelected) {
      this.material.color.setHex(config.visualization.pipe.selectedColor);
      if (this.arrow) {
        this.arrow.material.color.setHex(config.visualization.pipe.selectedColor);
      }
    } else {
      this.material.color.setHex(config.visualization.pipe.defaultColor);
      if (this.arrow) {
        this.arrow.material.color.setHex(config.visualization.pipe.defaultColor);
      }
    }
    
    // Update visibility
    this.mesh.visible = this.relationshipEntity.isVisible;
    if (this.arrow) {
      this.arrow.visible = this.relationshipEntity.isVisible;
    }
    if (this.label) {
      this.label.visible = this.relationshipEntity.isVisible;
    }
  }
  
  /**
   * Clean up resources
   * @param {boolean} [removeFromParent=true] - Whether to remove from parent
   */
  dispose(removeFromParent = true) {
    // Remove from parent
    if (removeFromParent) {
      if (this.parent && this.mesh && this.mesh.parent === this.parent) {
        this.parent.remove(this.mesh);
      }
      
      if (this.parent && this.arrow && this.arrow.parent === this.parent) {
        this.parent.remove(this.arrow);
      }
      
      if (this.parent && this.label && this.label.parent === this.parent) {
        this.parent.remove(this.label);
      }
    }
    
    // Dispose of geometries and materials
    if (this.geometry) this.geometry.dispose();
    if (this.material) this.material.dispose();
    
    if (this.arrow) {
      if (this.arrow.geometry) this.arrow.geometry.dispose();
      if (this.arrow.material) this.arrow.material.dispose();
    }
    
    if (this.label) {
      if (this.label.material.map) this.label.material.map.dispose();
      if (this.label.material) this.label.material.dispose();
    }
  }
}

export default Pipe;
